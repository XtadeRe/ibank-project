<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bid extends Model
{
    protected $table = 'bids';

    protected $fillable = [
        'user_id',
        'institution_id',
        'name',
        'phone',
        'tg_username',
        'files',
        'buy_method',
        'status',
        'institution_status',
        'instruction'
    ];

    protected $casts = [
        'files' => 'array'
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function institution() {
        return $this->belongsTo(Institution::class);
    }
}
