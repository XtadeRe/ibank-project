<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sandbox extends Model
{
    protected $fillable = [
        'name',
        'git_branch',
        'stack_type',
        'machine_ip',
        'status',
        'version',
        'last_deployed',
    ];

    protected $casts = [
        'last_deployed' => 'datetime',
    ];

    /**
     * Scope для последних 100 активных sandbox
     */
    public function scopeRecent($query)
    {
        return $query->select(['id', 'name', 'git_branch', 'version', 'status', 'created_at'])->latest()->limit(100);
    }

    public function scopeRunning($query)
    {
        return $query->where('status', 'running');
    }

    public function healthChecks()
    {
        return $this->hasMany(HealthCheck::class, 'sandbox_id', 'id');
    }

    public function incidents() 
    {
        return $this->hasMany(Incident::class);
    }

    public function history()
    {
        return $this->hasMany(History::class, 'sandbox_id', 'id');
    }
}
