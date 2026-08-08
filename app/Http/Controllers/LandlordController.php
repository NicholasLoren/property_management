<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LandlordController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = User::role('Landlord')->withCount('properties');

        if ($search !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        $query->orderBy('name', $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('landlords/index', [
            'landlords' => [
                'data' => $paginator->getCollection()->map(fn (User $landlord) => [
                    'id' => $landlord->id,
                    'name' => $landlord->name,
                    'email' => $landlord->email,
                    'properties_count' => $landlord->properties_count,
                ])->all(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
            ],
            'filters' => [
                'search' => $search,
                'dir' => $dir,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function show(User $landlord): Response
    {
        abort_unless($landlord->hasRole('Landlord'), 404);

        $landlord->load(['landlordDetail.media', 'properties' => fn ($q) => $q->withCount('units')]);
        $document = $landlord->landlordDetail?->getFirstMedia('id_document');

        return Inertia::render('landlords/show', [
            'landlord' => [
                'id' => $landlord->id,
                'name' => $landlord->name,
                'email' => $landlord->email,
                'id_number' => $landlord->landlordDetail?->id_number,
                'address' => $landlord->landlordDetail?->address,
                'phone' => $landlord->landlordDetail?->phone,
                'notes' => $landlord->landlordDetail?->notes,
                'id_document' => $document ? [
                    'name' => $document->file_name,
                    'url' => $document->getUrl(),
                ] : null,
                'properties' => $landlord->properties->map(fn (Property $property) => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'address' => $property->address,
                    'units_count' => $property->units_count,
                ])->all(),
                'created_at' => $landlord->created_at?->toIso8601String(),
            ],
        ]);
    }
}
