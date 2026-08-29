<?php

namespace App\Http\Controllers\Api;

use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterMemberRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\DuplicateDetector;
use App\Services\MemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly MemberService $members,
        private readonly DuplicateDetector $duplicates,
        private readonly AuditLogger $audit,
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

        $result = DB::transaction(function () use ($data, $request) {
            $memberRole = Role::where('slug', RoleSlug::Membre->value)->firstOrFail();

            $user = User::create([
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'],
                'password' => $data['password'],
                'role_id' => $memberRole->id,
                'province_id' => $data['province_id'],
                'city_id' => $data['city_id'] ?? null,
                'commune_id' => $data['commune_id'] ?? null,
                'structure_id' => $data['structure_id'] ?? null,
                'is_active' => true,
            ]);

            $member = $this->members->create(
                array_merge($data, ['user_id' => $user->id, 'consent_given' => true]),
                null,
                $request->file('photo'),
            );

            $user->forceFill(['member_id' => $member->id])->save();

            return ['user' => $user, 'member' => $member];
        });

        $this->audit->log('auth.registered', $result['member'], "Inscription publique {$result['member']->member_code}");

        $token = $result['user']->createToken($request->input('device_name', 'web'))->plainTextToken;

        return response()->json([
            'message' => 'Votre demande d\'adhésion a été enregistrée. Elle sera examinée par un responsable.',
            'member_code' => $result['member']->member_code,
            'token' => $token,
            'user' => new UserResource($result['user']->load(['role', 'member'])),
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

        return response()->json(['message' => 'Mot de passe mis à jour.']);
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
