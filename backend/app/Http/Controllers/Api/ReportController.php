<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Member;
use App\Services\AuditLogger;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly ReportService $reports,
        private readonly AuditLogger $audit,
    ) {}

    public function hub(Request $request): JsonResponse
    {
        return response()->json($this->reports->hub($request->user()));
    }

    public function members(Request $request): JsonResponse
    {
        $filters = $this->reports->validateFilters($request->all());
        $user = $request->user();
        $includeContact = $user->hasPermission(\App\Enums\Permission::MembersViewSensitive);

        $paginated = $this->reports->membersQuery($user, $filters)
            ->paginate(min((int) ($filters['per_page'] ?? 20), 100))
            ->withQueryString();

        return response()->json([
            'data' => $paginated->getCollection()
                ->map(fn (Member $m) => $this->reports->formatMemberRow($m, $includeContact))
                ->values()
                ->all(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    public function exportMembers(Request $request): StreamedResponse
    {
        $this->authorize('export', Member::class);

        $filters = $this->reports->validateFilters($request->all());
        $user = $request->user();
        $includeContact = $user->hasPermission(\App\Enums\Permission::MembersViewSensitive);
        $limit = (int) config('jeunesse.export.max_rows', 10000);

        $this->audit->log(
            'report.exported',
            null,
            'Export rapport membres (CSV)',
            [],
            ['filters' => $filters, 'format' => 'csv'],
        );

        $filename = 'rapport-membres-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($user, $filters, $limit, $includeContact) {
            $handle = fopen('php://output', 'wb');
            fwrite($handle, "\xEF\xBB\xBF");

            $headers = [
                'ID membre', 'Nom', 'Postnom', 'Prénom', 'Sexe', 'Date naissance',
                'Province', 'Ville', 'District', 'Commune', 'Quartier', 'Avenue', 'Structure',
                'Date inscription', 'Statut membre', 'Statut carte', 'Biométrie',
            ];

            if ($includeContact) {
                array_splice($headers, 6, 0, ['Téléphone', 'E-mail']);
            }

            fputcsv($handle, $headers, ';');

            $this->reports->membersQuery($user, $filters)
                ->limit($limit)
                ->chunk(500, function ($members) use ($handle, $includeContact) {
                    foreach ($members as $member) {
                        $row = $this->reports->formatMemberRow($member, $includeContact);
                        $line = [
                            $row['member_code'],
                            $row['last_name'],
                            $row['middle_name'],
                            $row['first_name'],
                            $row['gender_label'],
                            $row['birth_date'],
                            $row['province'],
                            $row['city'],
                            $row['district'],
                            $row['commune'],
                            $row['quartier'],
                            $row['avenue'],
                            $row['structure'],
                            $row['joined_at'] ?? $row['created_at'],
                            $row['status_label'],
                            $row['card_status_label'] ?? '—',
                            $row['biometric_enrolled'] ? 'Oui' : 'Non',
                        ];

                        if ($includeContact) {
                            array_splice($line, 6, 0, [$row['phone'] ?? '', $row['email'] ?? '']);
                        }

                        fputcsv($handle, $line, ';');
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function memberProfile(Request $request, Member $member): JsonResponse
    {
        $this->authorize('view', $member);

        return response()->json($this->reports->memberProfile($request->user(), $member));
    }

    public function activities(Request $request): JsonResponse
    {
        return response()->json($this->reports->activities($request->user(), $this->reports->validateFilters($request->all())));
    }

    public function activityDetail(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('view', $activity);

        return response()->json($this->reports->activityDetail($request->user(), $activity));
    }

    public function cards(Request $request): JsonResponse
    {
        return response()->json($this->reports->cards($request->user(), $this->reports->validateFilters($request->all())));
    }

    public function attendance(Request $request): JsonResponse
    {
        return response()->json($this->reports->attendance($request->user(), $this->reports->validateFilters($request->all())));
    }

    public function attendanceByMember(Request $request, Member $member): JsonResponse
    {
        $this->authorize('view', $member);

        return response()->json($this->reports->attendanceByMember($request->user(), $member));
    }

    public function users(Request $request): JsonResponse
    {
        $filters = $this->reports->validateFilters($request->all());

        return response()->json($this->reports->users($request->user(), $filters));
    }

    public function roles(Request $request): JsonResponse
    {
        return response()->json($this->reports->roles($request->user()));
    }
}
