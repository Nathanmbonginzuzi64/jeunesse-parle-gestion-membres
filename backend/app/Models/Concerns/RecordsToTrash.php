<?php

namespace App\Models\Concerns;

use App\Services\TrashService;

trait RecordsToTrash
{
    public static function bootRecordsToTrash(): void
    {
        static::deleted(function ($model): void {
            if (method_exists($model, 'isForceDeleting') && $model->isForceDeleting()) {
                return;
            }

            app(TrashService::class)->record($model);
        });

        static::restored(function ($model): void {
            app(TrashService::class)->markRestored($model);
        });
    }
}
