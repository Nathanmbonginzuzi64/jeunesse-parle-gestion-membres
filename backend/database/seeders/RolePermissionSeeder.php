<?php

namespace Database\Seeders;

use App\Enums\Permission as PermissionEnum;
use App\Enums\RoleSlug;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Matrice des droits par rôle.
     * Le super administrateur n'y figure pas : il court-circuite le catalogue.
     */
    private const MATRIX = [
        RoleSlug::AdminNational->value => [
            PermissionEnum::MembersView, PermissionEnum::MembersCreate, PermissionEnum::MembersUpdate,
            PermissionEnum::MembersDelete, PermissionEnum::MembersValidate, PermissionEnum::MembersChangeStatus,
            PermissionEnum::MembersExport, PermissionEnum::MembersViewSensitive,
            PermissionEnum::CardsView, PermissionEnum::CardsIssue, PermissionEnum::CardsRevoke, PermissionEnum::CardsVerify,
            PermissionEnum::StructuresView, PermissionEnum::StructuresManage, PermissionEnum::TerritoriesManage,
            PermissionEnum::ActivitiesView, PermissionEnum::ActivitiesManage,
            PermissionEnum::AttendanceView, PermissionEnum::AttendanceRecord,
            PermissionEnum::UsersView, PermissionEnum::UsersManage,
            PermissionEnum::StatisticsView, PermissionEnum::MapView, PermissionEnum::AuditView,
            PermissionEnum::NotificationsSend,
            PermissionEnum::TrashView, PermissionEnum::TrashManage,
        ],
        RoleSlug::ResponsableProvincial->value => [
            PermissionEnum::MembersView, PermissionEnum::MembersCreate, PermissionEnum::MembersUpdate,
            PermissionEnum::MembersValidate, PermissionEnum::MembersChangeStatus,
            PermissionEnum::MembersExport, PermissionEnum::MembersViewSensitive,
            PermissionEnum::CardsView, PermissionEnum::CardsIssue, PermissionEnum::CardsRevoke, PermissionEnum::CardsVerify,
            PermissionEnum::StructuresView, PermissionEnum::StructuresManage,
            PermissionEnum::ActivitiesView, PermissionEnum::ActivitiesManage,
            PermissionEnum::AttendanceView, PermissionEnum::AttendanceRecord,
            PermissionEnum::UsersView,
            PermissionEnum::StatisticsView, PermissionEnum::MapView,
            PermissionEnum::TrashView, PermissionEnum::TrashManage,
        ],
        RoleSlug::ResponsableVille->value => [
            PermissionEnum::MembersView, PermissionEnum::MembersCreate, PermissionEnum::MembersUpdate,
            PermissionEnum::MembersValidate, PermissionEnum::MembersChangeStatus, PermissionEnum::MembersViewSensitive,
            PermissionEnum::CardsView, PermissionEnum::CardsIssue, PermissionEnum::CardsVerify,
            PermissionEnum::StructuresView, PermissionEnum::StructuresManage,
            PermissionEnum::ActivitiesView, PermissionEnum::ActivitiesManage,
            PermissionEnum::AttendanceView, PermissionEnum::AttendanceRecord,
            PermissionEnum::StatisticsView, PermissionEnum::MapView,
            PermissionEnum::TrashView, PermissionEnum::TrashManage,
        ],
        RoleSlug::ResponsableLocal->value => [
            PermissionEnum::MembersView, PermissionEnum::MembersCreate, PermissionEnum::MembersUpdate,
            PermissionEnum::MembersViewSensitive,
            PermissionEnum::CardsView, PermissionEnum::CardsVerify,
            PermissionEnum::StructuresView,
            PermissionEnum::ActivitiesView, PermissionEnum::ActivitiesManage,
            PermissionEnum::AttendanceView, PermissionEnum::AttendanceRecord,
            PermissionEnum::StatisticsView,
            PermissionEnum::TrashView, PermissionEnum::TrashManage,
        ],
        RoleSlug::AgentVerification->value => [
            PermissionEnum::MembersView,
            PermissionEnum::CardsView, PermissionEnum::CardsVerify,
            PermissionEnum::AttendanceView, PermissionEnum::AttendanceRecord,
        ],
        // Le membre n'a aucune permission de catalogue : son accès à son propre
        // dossier passe uniquement par MemberPolicy::isOwnedBy().
        RoleSlug::Membre->value => [],
    ];

    private const DESCRIPTIONS = [
        RoleSlug::SuperAdmin->value => 'Accès complet à la plateforme, y compris la configuration et les rôles.',
        RoleSlug::AdminNational->value => 'Gestion nationale des membres, structures, activités et comptes.',
        RoleSlug::ResponsableProvincial->value => 'Gestion des membres et structures de sa province uniquement.',
        RoleSlug::ResponsableVille->value => 'Gestion des membres de sa ville ou de son territoire.',
        RoleSlug::ResponsableLocal->value => 'Gestion des membres de sa structure locale.',
        RoleSlug::AgentVerification->value => 'Vérification des cartes et enregistrement des présences.',
        RoleSlug::Membre->value => 'Accès à son propre profil, sa carte et ses notifications.',
    ];

    public function run(): void
    {
        foreach (PermissionEnum::cases() as $permission) {
            Permission::updateOrCreate(
                ['slug' => $permission->value],
                ['name' => $permission->label(), 'group' => $permission->group()],
            );
        }

        $permissionIds = Permission::pluck('id', 'slug');

        foreach (RoleSlug::cases() as $index => $slug) {
            $role = Role::updateOrCreate(
                ['slug' => $slug->value],
                [
                    'name' => $slug->label(),
                    'description' => self::DESCRIPTIONS[$slug->value] ?? null,
                    'scope_level' => $slug->scopeLevel(),
                    'priority' => $index,
                    'is_system' => true,
                ],
            );

            $granted = $slug === RoleSlug::SuperAdmin
                ? PermissionEnum::cases()
                : (self::MATRIX[$slug->value] ?? []);

            $role->permissions()->sync(
                collect($granted)->map(fn (PermissionEnum $p) => $permissionIds[$p->value])->all(),
            );
        }
    }
}
