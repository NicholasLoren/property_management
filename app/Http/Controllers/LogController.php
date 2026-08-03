<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class LogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $dir = $request->string('dir', 'desc')->value() === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->integer('per_page', 25);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 25;

        $query = Activity::query()->with('causer');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhereHasMorph('causer', [User::class], fn ($causerQuery) => $causerQuery->where('name', 'like', "%{$search}%"));
            });
        }

        $query->orderBy('created_at', $dir);

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('logs/index', [
            'logs' => [
                'data' => $paginator->getCollection()->map($this->transform(...))->all(),
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

    /**
     * @return array<string, mixed>
     */
    private function transform(Activity $activity): array
    {
        return [
            'id' => $activity->id,
            'description' => $activity->description,
            'log_name' => $activity->log_name,
            'event' => $activity->event,
            'causer_name' => $activity->causer instanceof User ? $activity->causer->name : null,
            'subject_type' => $activity->subject_type ? class_basename($activity->subject_type) : null,
            'ip' => $activity->getProperty('ip'),
            'browser' => $activity->getProperty('browser'),
            'platform' => $activity->getProperty('platform'),
            'device' => $activity->getProperty('device'),
            'created_at' => $activity->created_at?->toIso8601String(),
        ];
    }
}
