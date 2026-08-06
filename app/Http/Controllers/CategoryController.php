<?php

namespace App\Http\Controllers;

use App\Enums\CategoryType;
use App\Http\Requests\Extras\StoreCategoryRequest;
use App\Http\Requests\Extras\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CRUD for one Category `type` at a time (expense/income/document) — see
 * ExtrasController for the tabbed list these forms return to. A single
 * controller here (rather than three near-identical ones) because the type
 * is just a route segment, not a different data shape.
 */
class CategoryController extends Controller
{
    public function create(string $type): Response
    {
        return Inertia::render('extras/category-form', [
            'type' => $type,
            'typeLabel' => CategoryType::from($type)->label(),
        ]);
    }

    public function store(StoreCategoryRequest $request, string $type): RedirectResponse
    {
        $category = Category::create([
            'type' => $type,
            'name' => $request->validated('name'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$category->name} was added."]);

        return to_route('extras.index', $this->sectionFor($type));
    }

    /**
     * `Category $category` must come before `string $type` in every method
     * here: the controller dispatcher calls the action positionally (via
     * array_values on the route's resolved parameters), and route
     * parameters are ordered "real URI segments first, then defaults()
     * values" — {category} is a URI segment, `type` is only a default — so
     * declaring $type first silently swaps the two arguments.
     */
    public function edit(Category $category, string $type): Response
    {
        abort_unless($category->type->value === $type, 404);

        return Inertia::render('extras/category-form', [
            'type' => $type,
            'typeLabel' => CategoryType::from($type)->label(),
            'category' => ['id' => $category->id, 'name' => $category->name],
        ]);
    }

    public function update(UpdateCategoryRequest $request, Category $category, string $type): RedirectResponse
    {
        abort_unless($category->type->value === $type, 404);

        $category->update(['name' => $request->validated('name')]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$category->name} was updated."]);

        return to_route('extras.index', $this->sectionFor($type));
    }

    public function destroy(Request $request, Category $category, string $type): RedirectResponse
    {
        abort_unless($category->type->value === $type, 404);

        $category->forceFill(['deleted_by' => $request->user()->id])->save();
        $category->delete();

        return back();
    }

    public function restore(Category $category, string $type): RedirectResponse
    {
        $category->restore();
        $category->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$category->name} was restored."]);

        return back();
    }

    public function forceDelete(Category $category, string $type): RedirectResponse
    {
        $name = $category->name;

        try {
            $category->forceDelete();
        } catch (QueryException) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "Can't permanently delete \"{$name}\" — it's still used by existing records."]);

            return back();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} was permanently deleted."]);

        return back();
    }

    private function sectionFor(string $type): string
    {
        return "{$type}-categories";
    }
}
