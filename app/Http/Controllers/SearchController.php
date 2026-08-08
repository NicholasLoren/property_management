<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function quick(Request $request): JsonResponse
    {
        $q = $request->string('q')->trim()->value();

        return response()->json([
            'results' => $q === '' ? [] : $this->collectResults($request, $q, 5),
        ]);
    }

    public function index(Request $request): Response
    {
        $q = $request->string('q')->trim()->value();
        $results = $q === '' ? [] : $this->collectResults($request, $q, 20);

        $grouped = [];
        foreach ($results as $result) {
            $grouped[$result['type']][] = $result;
        }

        return Inertia::render('search/index', [
            'query' => $q,
            'results' => $grouped,
        ]);
    }

    /**
     * @return array<int, array{type: string, id: int, title: string, subtitle: string|null, url: string}>
     */
    private function collectResults(Request $request, string $q, int $limit): array
    {
        $user = $request->user();
        $results = [];

        if ($user->can('properties.view')) {
            $properties = Property::query()
                ->where(fn ($query) => $query->where('name', 'like', "%{$q}%")
                    ->orWhere('address', 'like', "%{$q}%"))
                ->limit($limit)
                ->get();

            foreach ($properties as $property) {
                $results[] = [
                    'type' => 'property',
                    'id' => $property->id,
                    'title' => $property->name,
                    'subtitle' => $property->address,
                    'url' => route('properties.show', $property),
                ];
            }
        }

        if ($user->can('units.view')) {
            $units = Unit::query()
                ->with('property')
                ->where(fn ($query) => $query->where('name', 'like', "%{$q}%")
                    ->orWhereHas('property', fn ($p) => $p->where('name', 'like', "%{$q}%")))
                ->limit($limit)
                ->get();

            foreach ($units as $unit) {
                $results[] = [
                    'type' => 'unit',
                    'id' => $unit->id,
                    'title' => $unit->name,
                    'subtitle' => $unit->property?->name,
                    'url' => route('units.show', ['property' => $unit->property_id, 'unit' => $unit->id]),
                ];
            }
        }

        if ($user->can('tenants.view')) {
            $tenants = Tenant::query()
                ->where(fn ($query) => $query->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%"))
                ->limit($limit)
                ->get();

            foreach ($tenants as $tenant) {
                $results[] = [
                    'type' => 'tenant',
                    'id' => $tenant->id,
                    'title' => $tenant->name,
                    'subtitle' => $tenant->email ?? $tenant->phone,
                    'url' => route('tenants.show', $tenant),
                ];
            }
        }

        if ($user->can('landlords.view')) {
            $landlords = User::role('Landlord')
                ->where(fn ($query) => $query->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%"))
                ->limit($limit)
                ->get();

            foreach ($landlords as $landlord) {
                $results[] = [
                    'type' => 'landlord',
                    'id' => $landlord->id,
                    'title' => $landlord->name,
                    'subtitle' => $landlord->email,
                    'url' => route('landlords.show', $landlord),
                ];
            }
        }

        if ($user->can('users.view')) {
            $staff = User::query()
                ->where(fn ($query) => $query->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%"))
                ->limit($limit)
                ->get();

            foreach ($staff as $person) {
                $results[] = [
                    'type' => 'user',
                    'id' => $person->id,
                    'title' => $person->name,
                    'subtitle' => $person->email,
                    'url' => route('users.show', $person),
                ];
            }
        }

        return $results;
    }
}
