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

    public function healthChecks()
    {
        return $this->hasMany(HealthCheck::class, 'sandbox_id', 'id');
    }

    public function incidents() {
        return $this->hasMany(Incident::class);
    }

    public function history()
    {
        return $this->hasMany(History::class, 'sandbox_id', 'id');
    }
}
