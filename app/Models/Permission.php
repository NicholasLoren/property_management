<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Models\Permission as SpatiePermission;

/**
 * @property int $id
 * @property string $name
 * @property string $label
 * @property string $guard_name
 * @property int|null $permission_category_id
 */
class Permission extends SpatiePermission
{
    /**
     * @return BelongsTo<PermissionCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(PermissionCategory::class, 'permission_category_id');
    }
}
