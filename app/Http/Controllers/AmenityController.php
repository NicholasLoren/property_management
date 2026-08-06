<?php

namespace App\Http\Controllers;

use App\Http\Requests\Extras\StoreAmenityRequest;
use App\Http\Requests\Extras\UpdateAmenityRequest;
use App\Models\Amenity;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AmenityController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('extras/amenity-form');
    }

    public function store(StoreAmenityRequest $request): RedirectResponse
    {
        $amenity = Amenity::create(['name' => $request->validated('name')]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$amenity->name} was added."]);

        return to_route('extras.index', 'property-features');
    }

    public function edit(Amenity $amenity): Response
    {
        return Inertia::render('extras/amenity-form', [
            'amenity' => ['id' => $amenity->id, 'name' => $amenity->name],
        ]);
    }

    public function update(UpdateAmenityRequest $request, Amenity $amenity): RedirectResponse
    {
        $amenity->update(['name' => $request->validated('name')]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$amenity->name} was updated."]);

        return to_route('extras.index', 'property-features');
    }

    public function destroy(Request $request, Amenity $amenity): RedirectResponse
    {
        $amenity->forceFill(['deleted_by' => $request->user()->id])->save();
        $amenity->delete();

        return back();
    }

    public function restore(Amenity $amenity): RedirectResponse
    {
        $amenity->restore();
        $amenity->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$amenity->name} was restored."]);

        return back();
    }

    public function forceDelete(Amenity $amenity): RedirectResponse
    {
        $name = $amenity->name;

        try {
            $amenity->forceDelete();
        } catch (QueryException) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "Can't permanently delete \"{$name}\" — it's still used by existing records."]);

            return back();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} was permanently deleted."]);

        return back();
    }
}
