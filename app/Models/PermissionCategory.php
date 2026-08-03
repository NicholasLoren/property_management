<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $label
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'label'])]
class PermissionCategory extends Model
{
    /**
     * @return HasMany<Permission, $this>
     */
    public function permissions(): HasMany
    {
        return $this->hasMany(Permission::class);
    }
}
