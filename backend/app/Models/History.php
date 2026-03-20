<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class History extends Model
{
    use HasFactory;

    protected $table = 'history';

    protected $fillable = [
        'sandbox_id',
        'action',
        'message'
    ];

    // Связь с Sandbox
    public function sandbox()
    {
        return $this->belongsTo(Sandbox::class);
    }

    // Вспомогательные методы для типов действий
    public static function log($sandboxId, $action, $message = null)
    {
        return self::create([
            'sandbox_id' => $sandboxId,
            'action' => $action,
            'message' => $message
        ]);
    }
}
