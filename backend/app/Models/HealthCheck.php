<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HealthCheck extends Model
{
    use HasFactory;

    protected $table = 'health_checks';

    protected $fillable = [
        'sandbox_id',
        'is_available',
        'response_time',
        'error_message'
    ];

    protected $casts = [
        'is_available' => 'boolean',
        'response_time' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Связь с Sandbox (многие к одному)
     */
    public function sandbox()
    {
        return $this->belongsTo(Sandbox::class, 'sandbox_id', 'id');
    }

    /**
     * Получить последнюю проверку для стека
     */
    public static function getLatestForSandbox($sandboxId)
    {
        return self::where('sandbox_id', $sandboxId)
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Получить статистику доступности за период
     */
    public static function getUptimeStats($sandboxId, $hours = 24)
    {
        $checks = self::where('sandbox_id', $sandboxId)
            ->where('created_at', '>=', now()->subHours($hours))
            ->get();

        if ($checks->isEmpty()) {
            return [
                'uptime' => 0,
                'total' => 0,
                'available' => 0
            ];
        }

        $total = $checks->count();
        $available = $checks->where('is_available', true)->count();
        $uptime = ($available / $total) * 100;

        return [
            'uptime' => round($uptime, 2),
            'total' => $total,
            'available' => $available
        ];
    }
}
