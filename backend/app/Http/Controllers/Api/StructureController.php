<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStructureRequest;
use App\Http\Resources\StructureResource;
use App\Models\Structure;
use App\Services\AuditLogger;
use App\Services\IdentifierGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StructureController extends Controller
{
    public function __construct(
        private readonly IdentifierGenerator $identifiers,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Structure::class);

        $user = $request->user();

        $structures = Structure::query()
            ->with(['province:id,name', 'city:id,name', 'commune:id,name', 'zone:id,name'])
            ->withCount('members')
            ->when(! $user->isNationalScope(), function (Builder $q) use ($user) {
                match ($user->scopeLevel()) {
                    1 => $q->where('province_id', $user->province_id ?? 0),
                    2 => $q->where('city_id', $user->city_id ?? 0),
                    default => $q->where('id', $user->structure_id ?? 0),
                };
            })
            ->when($request->input('q'), fn (Builder $q, $v) => $q->where(function (Builder $sub) use ($v) {
                $sub->where('name', 'like', '%'.$v.'%')->orWhere('code', 'like', '%'.$v.'%');
            }))
            ->when($request->integer('province_id'), fn (Builder $q, $v) => $q->where('province_id', $v))
            ->when($request->integer('city_id'), fn (Builder $q, $v) => $q->where('city_id', $v))
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 25), 100))
            ->withQueryString();

        return StructureResource::collection($structures);
    }

    public function store(StoreStructureRequest $request): JsonResponse
    {
        $structure = Structure::create(array_merge($request->validated(), [
            'code' => $this->identifiers->structureCode(),
        ]));

        $this->audit->log('structure.created', $structure, "Création de la structure {$structure->code}");

        return response()->json([
            'message' => 'Structure créée.',
            'data' => new StructureResource($structure->load(['province', 'city', 'commune', 'zone'])),
        ], 201);
    }

    public function show(Request $request, Structure $structure): JsonResponse
    {
        $this->authorize('view', $structure);

        return response()->json([
            'data' => new StructureResource(
                $structure->load(['province', 'city', 'commune', 'zone', 'leader'])->loadCount('members'),
            ),
        ]);
    }

    public function update(Request $request, Structure $structure): JsonResponse
    {
        $this->authorize('update', $structure);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'address' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'contact_email' => ['nullable', 'email:rfc', 'max:160'],
            'leader_member_id' => ['nullable', 'integer', 'exists:members,id'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $before = $structure->getAttributes();
        $structure->update($validated);

        $this->audit->logChanges('structure.updated', $structure, $before, "Modification de {$structure->code}");

        return response()->json([
            'message' => 'Structure mise à jour.',
            'data' => new StructureResource($structure->load(['province', 'city', 'commune', 'zone'])),
        ]);
    }

    public function disable(Request $request, Structure $structure): JsonResponse
    {
        $this->authorize('update', $structure);

        $structure->update(['is_active' => false]);

        $this->audit->log('structure.disabled', $structure, "Désactivation de {$structure->code}");

        return response()->json(['message' => 'Structure désactivée.']);
    }

    public function destroy(Request $request, Structure $structure): JsonResponse
    {
        $this->authorize('delete', $structure);

        if ($structure->members()->exists()) {
            return response()->json([
                'message' => 'Cette structure compte encore des membres. Transférez-les avant de la supprimer.',
            ], 422);
        }

        $structure->delete();

        $this->audit->log('structure.deleted', $structure, "Suppression de {$structure->code}");

        return response()->json(['message' => 'Structure supprimée.']);
    }
}
