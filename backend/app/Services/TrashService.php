<?php

namespace App\Services;

use App\Enums\Permission;
use App\Enums\RoleSlug;
use App\Models\Activity;
use App\Models\ChatMessage;
use App\Models\HomePost;
use App\Models\JpMessage;
use App\Models\Member;
use App\Models\NewsComment;
use App\Models\NewsPost;
use App\Models\Structure;
use App\Models\TrashItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TrashService
{
    private const REDACTED = [
        'password', 'remember_token', 'two_factor_secret', 'api_token',
        'template_reference', 'private_key',
    ];

    public function record(Model $model): ?TrashItem
    {
        $existing = TrashItem::query()
            ->active()
            ->where('subject_type', $model::class)
            ->where('subject_id', $model->getKey())
            ->first();

        if ($existing) {
            return $existing;
        }

        $user = Auth::user();
        $item = TrashItem::query()->create([
            'subject_type' => $model::class,
            'subject_id' => $model->getKey(),
            'module' => $this->moduleFor($model),
            'label' => $this->labelFor($model),
            'payload' => $this->snapshot($model),
            'deleted_by' => $user?->id,
            'deleted_by_name' => $user?->name,
        ]);

        $this->notifySuperAdmins($item);

        return $item;
    }

    public function markRestored(Model $model): void
    {
        TrashItem::query()
            ->active()
            ->where('subject_type', $model::class)
            ->where('subject_id', $model->getKey())
            ->update([
                'restored_at' => now(),
                'restored_by' => Auth::id(),
            ]);
    }

    public function restore(TrashItem $item, User $actor): Model
    {
        abort_unless($item->restored_at === null && $item->purged_at === null, 422, 'Cet élément n\'est plus dans la corbeille.');

        $this->assertCanManageItem($item, $actor);

        $class = $item->subject_type;
        abort_unless(class_exists($class) && is_subclass_of($class, Model::class), 422, 'Type d\'élément inconnu.');

        /** @var Model $model */
        $model = $class::withTrashed()->find($item->subject_id);
        abort_unless($model, 404, 'Enregistrement introuvable pour restauration.');
        abort_unless(method_exists($model, 'restore'), 422, 'Cet élément ne peut pas être restauré.');

        $model->restore();

        $item->update([
            'restored_at' => now(),
            'restored_by' => $actor->id,
        ]);

        app(AuditLogger::class)->log('trash.restored', $model, "Restauration depuis la corbeille : {$item->label}");

        return $model;
    }

    public function purge(TrashItem $item, User $actor): void
    {
        abort_unless($actor->hasPermission(Permission::TrashManage), 403);
        abort_unless($this->isSuperAdmin($actor), 403, 'Seul le SuperAdmin peut purger définitivement.');
        abort_unless($item->restored_at === null && $item->purged_at === null, 422, 'Cet élément n\'est plus dans la corbeille.');

        $class = $item->subject_type;
        if (class_exists($class) && is_subclass_of($class, Model::class)) {
            /** @var Model|null $model */
            $model = $class::withTrashed()->find($item->subject_id);
            if ($model && method_exists($model, 'forceDelete')) {
                $model->forceDelete();
            }
        }

        $item->update(['purged_at' => now()]);
        app(AuditLogger::class)->log('trash.purged', null, "Purge définitive : {$item->label}");
    }

    public function assertCanManageItem(TrashItem $item, User $actor): void
    {
        if ($this->isSuperAdmin($actor)) {
            return;
        }

        abort_unless(
            (int) $item->deleted_by === (int) $actor->id,
            403,
            'Vous ne pouvez restaurer que vos propres suppressions.'
        );
    }

    public function isSuperAdmin(User $user): bool
    {
        return $user->role?->slug === RoleSlug::SuperAdmin->value;
    }

    private function notifySuperAdmins(TrashItem $item): void
    {
        try {
            $admins = User::query()
                ->whereHas('role', fn ($q) => $q->where('slug', RoleSlug::SuperAdmin->value))
                ->get();

            foreach ($admins as $admin) {
                if ($item->deleted_by && (int) $admin->id === (int) $item->deleted_by) {
                    continue;
                }
                app(NotificationService::class)->pushToUser(
                    $admin,
                    \App\Enums\NotificationType::AdminSystemAlert,
                    '🗑️ Élément mis en corbeille',
                    ($item->deleted_by_name ?: 'Un utilisateur')." a supprimé : {$item->label} ({$item->module}).",
                    [
                        'action' => 'view_trash',
                        'trash_item_id' => $item->id,
                        'module' => $item->module,
                    ],
                    'warning',
                );
            }
        } catch (\Throwable) {
            /* ne bloque jamais la suppression */
        }
    }

    private function moduleFor(Model $model): string
    {
        return match (true) {
            $model instanceof Member => 'members',
            $model instanceof User => 'users',
            $model instanceof Activity => 'activities',
            $model instanceof Structure => 'structures',
            $model instanceof NewsPost => 'news',
            $model instanceof NewsComment => 'news_comments',
            $model instanceof HomePost => 'home_posts',
            $model instanceof JpMessage => 'jp_messages',
            $model instanceof ChatMessage => 'chat',
            default => Str::of(class_basename($model))->snake()->toString(),
        };
    }

    private function labelFor(Model $model): string
    {
        return match (true) {
            $model instanceof Member => trim(($model->full_name ?? '').' '.($model->member_code ?? '')) ?: "Membre #{$model->getKey()}",
            $model instanceof User => $model->name.' ('.$model->email.')',
            $model instanceof Activity => $model->title.' ('.$model->code.')',
            $model instanceof Structure => $model->name,
            $model instanceof NewsPost => $model->title,
            $model instanceof HomePost => Str::limit((string) ($model->title ?? $model->body ?? 'Post'), 80),
            $model instanceof JpMessage => $model->subject ?? $model->reference ?? "JP Message #{$model->getKey()}",
            $model instanceof ChatMessage => 'Message chat #'.$model->getKey(),
            $model instanceof NewsComment => 'Commentaire #'.$model->getKey(),
            default => class_basename($model).' #'.$model->getKey(),
        };
    }

    private function snapshot(Model $model): array
    {
        $attrs = $model->getAttributes();
        foreach (self::REDACTED as $key) {
            unset($attrs[$key]);
        }

        return $attrs;
    }
}
