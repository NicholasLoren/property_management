<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class DocsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('docs/index', [
            'manifest' => $this->manifest(),
        ]);
    }

    public function show(string $module, string $page): Response
    {
        $manifest = $this->manifest();

        $moduleEntry = collect($manifest)->firstWhere('slug', $module);
        $pageEntry = collect($moduleEntry['pages'] ?? [])->firstWhere('slug', $page);

        abort_unless($moduleEntry && $pageEntry, 404);

        $path = resource_path("docs/{$module}/{$page}.md");

        abort_unless(File::exists($path), 404);

        return Inertia::render('docs/show', [
            'manifest' => $manifest,
            'module' => $moduleEntry['title'],
            'title' => $pageEntry['title'],
            'content' => File::get($path),
        ]);
    }

    /**
     * @return array<int, array{slug: string, title: string, description: string, pages: array<int, array{slug: string, title: string}>}>
     */
    private function manifest(): array
    {
        return require resource_path('docs/manifest.php');
    }
}
