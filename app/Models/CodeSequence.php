<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * One row per code-generation `type` (property, unit, document, expense,
 * income, ...), tracking the next `{seq}` number to hand out. Kept as its
 * own table rather than a Setting so CodeGenerator can lock a single row
 * for update and increment it atomically under concurrent requests.
 *
 * @property int $id
 * @property string $type
 * @property int $next_number
 */
#[Fillable(['type', 'next_number'])]
class CodeSequence extends Model
{
    //
}
