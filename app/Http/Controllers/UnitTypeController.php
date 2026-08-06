<?php

namespace App\Http\Controllers;

use App\Http\Requests\Extras\StoreUnitTypeRequest;
use App\Http\Requests\Extras\UpdateUnitTypeRequest;
use App\Models\UnitType;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnitTypeController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('extras/unit-type-form');
    }

    public function store(StoreUnitTypeRequest $request): RedirectResponse
    {
        $unitType = UnitType::create([
            'name' => $request->validated('name'),
            'label' => $request->validated('label'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$unitType->label} was added."]);

        return to_route('extras.index', 'unit-types');
    }

    public function edit(UnitType $unitType): Response
    {
        return Inertia::render('extras/unit-type-form', [
            'unitType' => ['id' => $unitType->id, 'name' => $unitType->name, 'label' => $unitType->label],
        ]);
    }

    public function update(UpdateUnitTypeRequest $request, UnitType $unitType): RedirectResponse
    {
        $unitType->update([
            'name' => $request->validated('name'),
            'label' => $request->validated('label'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$unitType->label} was updated."]);

        return to_route('extras.index', 'unit-types');
    }

    public function destroy(Request $request, UnitType $unitType): RedirectResponse
    {
        $unitType->forceFill(['deleted_by' => $request->user()->id])->save();
        $unitType->delete();

        return back();
    }

    public function restore(UnitType $unitType): RedirectResponse
    {
        $unitType->restore();
        $unitType->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$unitType->label} was restored."]);

        return back();
    }

    public function forceDelete(UnitType $unitType): RedirectResponse
    {
        $label = $unitType->label;

        try {
            $unitType->forceDelete();
        } catch (QueryException) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "Can't permanently delete \"{$label}\" — it's still used by existing records."]);

            return back();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$label} was permanently deleted."]);

        return back();
    }
}
