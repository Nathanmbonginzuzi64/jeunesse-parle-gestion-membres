<?php

namespace App\Services;

use App\Models\Member;
use Illuminate\Support\Collection;

/**
 * Signale les adhésions potentiellement en double.
 *
 * Aucune suppression ni fusion automatique : le service se contente de produire
 * une liste de correspondances qu'un responsable devra trancher manuellement.
 */
class DuplicateDetector
{
    public function findMatches(array $data, ?int $ignoreMemberId = null): Collection
    {
        $phone = $this->normalizePhone($data['phone'] ?? null);
        $email = isset($data['email']) ? mb_strtolower(trim((string) $data['email'])) : null;
        $lastName = mb_strtolower(trim((string) ($data['last_name'] ?? '')));
        $firstName = mb_strtolower(trim((string) ($data['first_name'] ?? '')));
        $birthDate = $data['birth_date'] ?? null;

        $query = Member::query()
            ->withTrashed()
            ->when($ignoreMemberId, fn ($q) => $q->whereKeyNot($ignoreMemberId))
            ->where(function ($q) use ($phone, $email, $lastName, $firstName, $birthDate) {
                if ($phone) {
                    $q->orWhere('phone', 'like', '%'.$phone)
                        ->orWhere('phone_alt', 'like', '%'.$phone);
                }

                if ($email) {
                    $q->orWhereRaw('LOWER(email) = ?', [$email]);
                }

                if ($lastName !== '' && $firstName !== '') {
                    $q->orWhere(function ($sub) use ($lastName, $firstName, $birthDate) {
                        $sub->whereRaw('LOWER(last_name) = ?', [$lastName])
                            ->whereRaw('LOWER(first_name) = ?', [$firstName]);

                        if ($birthDate) {
                            $sub->where('birth_date', $birthDate);
                        }
                    });
                }
            })
            ->limit(10);

        return $query->get()->map(fn (Member $member) => [
            'id' => $member->id,
            'member_code' => $member->member_code,
            'full_name' => $member->full_name,
            'phone' => $this->maskPhone($member->phone),
            'status' => $member->status->label(),
            'reasons' => $this->reasonsFor($member, $phone, $email, $lastName, $firstName),
        ])->values();
    }

    private function reasonsFor(Member $member, ?string $phone, ?string $email, string $lastName, string $firstName): array
    {
        $reasons = [];

        if ($phone && (str_ends_with($member->phone, $phone) || str_ends_with((string) $member->phone_alt, $phone))) {
            $reasons[] = 'Numéro de téléphone identique';
        }

        if ($email && mb_strtolower((string) $member->email) === $email) {
            $reasons[] = 'Adresse e-mail identique';
        }

        if (mb_strtolower($member->last_name) === $lastName && mb_strtolower($member->first_name) === $firstName) {
            $reasons[] = 'Nom et prénom identiques';
        }

        return $reasons;
    }

    /** Conserve les 9 derniers chiffres pour comparer malgré les préfixes (+243, 0…). */
    private function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);

        return $digits ? substr($digits, -9) : null;
    }

    private function maskPhone(?string $phone): ?string
    {
        if (! $phone || strlen($phone) < 4) {
            return $phone;
        }

        return str_repeat('•', max(0, strlen($phone) - 4)).substr($phone, -4);
    }
}
