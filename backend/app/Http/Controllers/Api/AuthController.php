<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterMemberRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\BiometricService;
use App\Services\DuplicateDetector;
use App\Services\MemberService;
use App\Services\PhotoStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly MemberService $members,
        private readonly DuplicateDetector $duplicates,
        private readonly AuditLogger $audit,
        private readonly BiometricService $biometrics,
        private readonly PhotoStorageService $photos,
    ) {}

    /**
     * Inscription publique. Le dossier créé reste « en attente » : aucune carte
     * n'est émise avant validation par un responsable habilité.
     */
    public function register(RegisterMemberRequest $request): JsonResponse
    {
        $data = $request->validated();

        $matches = $this->duplicates->findMatches($data);

        if ($matches->isNotEmpty() && ! $request->boolean('confirm_duplicate')) {
            return response()->json([
                'message' => 'Un membre potentiellement similaire existe déjà.',
                'duplicates' => $matches,
                'requires_confirmation' => true,
            ], 409);
        }

        $member = $this->members->create(
            array_merge($data, ['consent_given' => true]),
            null,
            $request->file('photo'),
        );

        $user = User::query()->findOrFail($member->user_id);

        $this->audit->log('auth.registered', $member, "Inscription publique {$member->member_code}");

        $token = $user->createToken($request->input('device_name', 'web'))->plainTextToken;

        return response()->json([
            'message' => 'Votre demande d\'adhésion a été enregistrée. Elle sera examinée par un responsable.',
            'member_code' => $member->member_code,
            'token' => $token,
            'user' => new UserResource($user->load(['role', 'member'])),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $login = trim($request->input('login'));

        $user = User::with('role.permissions')
            ->where(function ($query) use ($login) {
                $query->where('email', mb_strtolower($login))
                    ->orWhere('phone', preg_replace('/[\s().-]+/', '', $login));
            })
            ->first();

        if ($user?->isLocked()) {
            throw ValidationException::withMessages([
                'login' => 'Compte temporairement verrouillé après plusieurs tentatives. Réessayez plus tard.',
            ]);
        }

        // Message identique dans tous les cas d'échec : aucune énumération de comptes.
        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            $user?->registerFailedLogin(
                (int) config('jeunesse.security.max_login_attempts'),
                (int) config('jeunesse.security.lockout_minutes'),
            );

            throw ValidationException::withMessages([
                'login' => 'Identifiants incorrects.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'login' => 'Votre compte est désactivé. Contactez un administrateur.',
            ]);
        }

        $user->registerSuccessfulLogin($request->ip());
        $user->tokens()->where('name', $request->input('device_name', 'web'))->delete();

        $token = $user->createToken($request->input('device_name', 'web'))->plainTextToken;

        $this->audit->log('auth.login', $user, "Connexion de {$user->name}");

        return response()->json([
            'message' => 'Connexion réussie.',
            'token' => $token,
            'user' => new UserResource($user->load(['role.permissions', 'province', 'city', 'structure', 'member'])),
        ]);
    }

    /**
     * Connexion par empreinte : le client envoie l'échantillon capturé ;
     * le matching et l'autorisation sont décidés uniquement côté serveur.
     */
    public function loginFingerprint(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'login' => ['required', 'string', 'max:160'],
            'template_hash' => ['nullable', 'string', 'min:8', 'max:255'],
            'format' => ['nullable', 'string', 'in:hardware,simulation'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);

        $login = trim($validated['login']);
        $format = $validated['format'] ?? 'hardware';

        $user = User::with('role.permissions')
            ->where(function ($query) use ($login) {
                $query->where('email', mb_strtolower($login))
                    ->orWhere('phone', preg_replace('/[\s().-]+/', '', $login));
            })
            ->first();

        if (! $user) {
            return response()->json([
                'valid' => false,
                'message' => 'Aucun compte ne correspond à cet identifiant.',
            ], 422);
        }

        if ($user->isLocked()) {
            return response()->json([
                'valid' => false,
                'message' => 'Compte temporairement verrouillé après plusieurs tentatives.',
            ], 422);
        }

        if (! $user->is_active) {
            return response()->json([
                'valid' => false,
                'message' => 'Ce compte est désactivé. Contactez un administrateur.',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_active' => false,
                    'role' => $user->role?->slug,
                    'fingerprint_enrolled' => $this->biometrics->userIsEnrolled($user),
                ],
            ], 403);
        }

        if (! $this->biometrics->userIsEnrolled($user)) {
            return response()->json([
                'valid' => false,
                'message' => 'Aucune empreinte enregistrée — demandez à un administrateur de configurer la biométrie.',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_active' => true,
                    'role' => $user->role?->slug,
                    'fingerprint_enrolled' => false,
                ],
            ], 422);
        }

        try {
            $this->biometrics->matchUser($user, $validated['template_hash'] ?? null, $format);
        } catch (ValidationException $e) {
            $user->registerFailedLogin(
                (int) config('jeunesse.security.max_login_attempts'),
                (int) config('jeunesse.security.lockout_minutes'),
            );

            return response()->json([
                'valid' => false,
                'message' => collect($e->errors())->flatten()->first() ?? 'Empreinte non reconnue.',
            ], 422);
        }

        $user->registerSuccessfulLogin($request->ip());
        $user->tokens()->where('name', $validated['device_name'] ?? 'web')->delete();
        $token = $user->createToken($validated['device_name'] ?? 'web')->plainTextToken;

        $this->audit->log('auth.login-fingerprint', $user, "Connexion biométrique de {$user->name}");

        return response()->json([
            'valid' => true,
            'message' => $user->must_change_password
                ? 'Connexion biométrique réussie — vous devez changer votre mot de passe.'
                : 'Connexion biométrique réussie.',
            'token' => $token,
            'user' => new UserResource($user->load(['role.permissions', 'province', 'city', 'structure', 'member'])),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        $this->audit->log('auth.logout', $request->user(), 'Déconnexion');

        return response()->json(['message' => 'Déconnexion effectuée.']);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        $this->audit->log('auth.logout-all', $request->user(), 'Révocation de toutes les sessions');

        return response()->json(['message' => 'Toutes les sessions ont été fermées.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load([
            'role.permissions', 'province', 'city', 'commune', 'structure',
            'member.province', 'member.structure', 'member.activeCard',
        ]);

        return response()->json([
            'user' => new UserResource($user),
            'member' => $user->member ? new \App\Http\Resources\MemberResource($user->member) : null,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:160', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($user->id)],
            'photo' => [
                'nullable',
                'file',
                'max:'.(int) config('jeunesse.photo.max_kilobytes'),
                'mimes:'.implode(',', config('jeunesse.photo.mimes')),
            ],
        ]);

        $user->fill([
            'name' => $validated['name'],
            'email' => mb_strtolower($validated['email']),
            'phone' => $validated['phone'] ?? null,
        ]);

        if ($photo = $request->file('photo')) {
            $user->photo_path = $this->photos->store(
                $photo,
                'user-'.$user->id,
                $user->photo_path,
                PhotoStorageService::USER_DIRECTORY,
            );
        }

        $user->save();

        $this->audit->log('auth.profile-updated', $user, 'Mise à jour du profil');

        return response()->json([
            'message' => 'Profil mis à jour.',
            'user' => new UserResource($user->fresh()->load([
                'role.permissions', 'province', 'city', 'structure', 'member',
            ])),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'Le mot de passe actuel est incorrect.',
            ]);
        }

        $user->forceFill([
            'password' => $validated['password'],
            'must_change_password' => false,
        ])->save();

        // Les autres sessions deviennent caduques après un changement de secret.
        $currentTokenId = $user->currentAccessToken()->id;
        $user->tokens()->whereKeyNot($currentTokenId)->delete();

        $this->audit->log('auth.password-changed', $user, 'Changement de mot de passe');

        return response()->json([
            'message' => 'Mot de passe mis à jour.',
            'user' => new UserResource($user->fresh()->load(['role.permissions', 'province', 'city', 'structure', 'member'])),
        ]);
    }

    /**
     * Demande de réinitialisation. La réponse est toujours identique afin de ne pas
     * révéler l'existence d'un compte.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['login' => ['required', 'string', 'max:160']]);

        $login = trim($request->input('login'));
        $user = User::query()
            ->where(function ($query) use ($login) {
                $query->where('email', mb_strtolower($login))
                    ->orWhere('phone', preg_replace('/[\s().-]+/', '', $login));
            })
            ->first();

        if ($user?->email) {
            PasswordBroker::sendResetLink(['email' => $user->email]);
        }

        $this->audit->log('auth.password-reset-requested', $user, 'Demande de réinitialisation');

        return response()->json([
            'message' => 'Si un compte correspond, les instructions de réinitialisation ont été envoyées.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email:rfc'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $status = PasswordBroker::reset(
            [
                'email' => mb_strtolower($validated['email']),
                'password' => $validated['password'],
                'password_confirmation' => $request->input('password_confirmation'),
                'token' => $validated['token'],
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                    'must_change_password' => false,
                ])->save();

                $user->tokens()->delete();
            },
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => 'Ce lien de réinitialisation est invalide ou a expiré.',
            ]);
        }

        $this->audit->log('auth.password-reset', null, 'Réinitialisation du mot de passe');

        return response()->json(['message' => 'Mot de passe réinitialisé. Vous pouvez vous connecter.']);
    }
}
