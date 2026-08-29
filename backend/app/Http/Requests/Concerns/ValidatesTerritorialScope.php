<?php

namespace App\Http\Requests\Concerns;

use App\Models\User;
use Illuminate\Contracts\Validation\Validator;

/**
 * Empêche un responsable de créer ou déplacer une ressource hors de son périmètre.
 * Sans ce garde-fou, une simple manipulation du corps de la requête suffirait à
 * écrire dans une autre province.
 */
trait ValidatesTerritorialScope
{
    protected function enforceTerritorialScope(Validator $validator): void
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user || $user->isNationalScope()) {
            return;
        }

        $checks = match ($user->scopeLevel()) {
            1 => ['province_id' => $user->province_id],
            2 => ['city_id' => $user->city_id],
            3 => ['structure_id' => $user->structure_id],
            default => [],
        };

        foreach ($checks as $field => $allowed) {
            $submitted = $this->input($field);

            if ($submitted !== null && (int) $submitted !== (int) $allowed) {
                $validator->errors()->add(
                    $field,
                    'Vous ne pouvez pas intervenir en dehors de votre zone de responsabilité.',
                );
            }
        }
    }

    /**
     * Pré-remplit le territoire du compte lorsqu'il n'est pas fourni.
     *
     * Les valeurs déjà présentes ne sont jamais écrasées : une tentative
     * d'écriture hors périmètre doit produire une erreur explicite via
     * `enforceTerritorialScope()`, pas être corrigée en silence.
     */
    protected function applyScopeDefaults(): void
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user || $user->isNationalScope()) {
            return;
        }

        $defaults = array_filter([
            'province_id' => $user->province_id,
            'city_id' => $user->scopeLevel() >= 2 ? $user->city_id : null,
            'structure_id' => $user->scopeLevel() >= 3 ? $user->structure_id : null,
        ], fn ($value) => $value !== null);

        foreach ($defaults as $field => $value) {
            if ($this->input($field) === null) {
                $this->merge([$field => $value]);
            }
        }
    }
}
