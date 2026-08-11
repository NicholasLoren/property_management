<?php

namespace App\Http\Controllers;

use App\Enums\TransactionType;
use App\Models\Document;
use App\Models\Lease;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Transaction;
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

        if ($user->can('leases.view')) {
            $leases = Lease::query()
                ->with(['unit.property', 'tenants'])
                ->where(fn ($query) => $query->whereHas('unit', fn ($u) => $u->where('name', 'like', "%{$q}%")
                    ->orWhereHas('property', fn ($p) => $p->where('name', 'like', "%{$q}%")))
                    ->orWhereHas('tenants', fn ($t) => $t->where('name', 'like', "%{$q}%")))
                ->limit($limit)
                ->get();

            foreach ($leases as $lease) {
                $tenantNames = $lease->tenants->pluck('name')->implode(', ');

                $results[] = [
                    'type' => 'lease',
                    'id' => $lease->id,
                    'title' => $lease->unit
                        ? "{$lease->unit->name} — {$lease->unit->property?->name}"
                        : "Lease #{$lease->id}",
                    'subtitle' => $tenantNames !== '' ? $tenantNames : $lease->status->label(),
                    'url' => route('leases.show', $lease),
                ];
            }
        }

        if ($user->can('payments.view')) {
            $payments = Payment::query()
                ->with(['tenant', 'lease.unit.property'])
                ->where(fn ($query) => $query->where('reference', 'like', "%{$q}%")
                    ->orWhereHas('tenant', fn ($t) => $t->where('name', 'like', "%{$q}%"))
                    ->orWhereHas('lease.unit', fn ($u) => $u->where('name', 'like', "%{$q}%"))
                    ->orWhereHas('lease.unit.property', fn ($p) => $p->where('name', 'like', "%{$q}%")))
                ->limit($limit)
                ->get();

            foreach ($payments as $payment) {
                $searchTerm = $payment->reference ?: $payment->tenant?->name;

                $results[] = [
                    'type' => 'payment',
                    'id' => $payment->id,
                    'title' => $payment->reference ?: "Payment #{$payment->id}",
                    'subtitle' => $payment->tenant?->name,
                    'url' => route('payments.index', $searchTerm ? ['search' => $searchTerm] : []),
                ];
            }
        }

        if ($user->can('expenses.view')) {
            $expenses = Transaction::query()
                ->where('type', TransactionType::Expense->value)
                ->with('property')
                ->where(fn ($query) => $query->where('description', 'like', "%{$q}%")
                    ->orWhere('code', 'like', "%{$q}%")
                    ->orWhereHas('property', fn ($p) => $p->where('name', 'like', "%{$q}%")))
                ->limit($limit)
                ->get();

            foreach ($expenses as $expense) {
                $results[] = [
                    'type' => 'expense',
                    'id' => $expense->id,
                    'title' => $expense->description ?: $expense->code,
                    'subtitle' => $expense->property?->name,
                    'url' => route('expenses.index', ['search' => $expense->code]),
                ];
            }
        }

        if ($user->can('incomes.view')) {
            $incomes = Transaction::query()
                ->where('type', TransactionType::Income->value)
                ->with('property')
                ->where(fn ($query) => $query->where('description', 'like', "%{$q}%")
                    ->orWhere('code', 'like', "%{$q}%")
                    ->orWhereHas('property', fn ($p) => $p->where('name', 'like', "%{$q}%")))
                ->limit($limit)
                ->get();

            foreach ($incomes as $income) {
                $results[] = [
                    'type' => 'income',
                    'id' => $income->id,
                    'title' => $income->description ?: $income->code,
                    'subtitle' => $income->property?->name,
                    'url' => route('incomes.index', ['search' => $income->code]),
                ];
            }
        }

        if ($user->can('maintenance.view')) {
            $maintenanceRequests = MaintenanceRequest::query()
                ->with('unit.property')
                ->where(fn ($query) => $query->where('title', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%")
                    ->orWhereHas('unit', fn ($u) => $u->where('name', 'like', "%{$q}%")
                        ->orWhereHas('property', fn ($p) => $p->where('name', 'like', "%{$q}%"))))
                ->limit($limit)
                ->get();

            foreach ($maintenanceRequests as $maintenanceRequest) {
                $results[] = [
                    'type' => 'maintenance',
                    'id' => $maintenanceRequest->id,
                    'title' => $maintenanceRequest->title,
                    'subtitle' => $maintenanceRequest->unit
                        ? "{$maintenanceRequest->unit->name} · {$maintenanceRequest->unit->property?->name}"
                        : null,
                    'url' => route('maintenance.show', $maintenanceRequest),
                ];
            }
        }

        if ($user->can('documents.view')) {
            $documents = Document::query()
                ->where(fn ($query) => $query->where('title', 'like', "%{$q}%")
                    ->orWhere('code', 'like', "%{$q}%"))
                ->limit($limit)
                ->get();

            foreach ($documents as $document) {
                $results[] = [
                    'type' => 'document',
                    'id' => $document->id,
                    'title' => $document->title,
                    'subtitle' => $document->code,
                    'url' => route('documents.index', ['search' => $document->title]),
                ];
            }
        }

        return $results;
    }
}
