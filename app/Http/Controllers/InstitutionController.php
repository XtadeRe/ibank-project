<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InstitutionController extends Controller
{
    public function index()
    {
        $institutions = Institution::all();

        return Inertia::render('Catalog', [
            'institutions' => $institutions
        ]);
    }

    public function main() {
        $institutions = Institution::orderBy('views', 'desc')->take(3)->get();

        return Inertia::render('Main', [
            'institutions' => $institutions
        ]);
    }

    public function showFromRules() {
        return Inertia::render('Immigration', [
            'countries' => Institution::distinct()->pluck('country')
        ]);
    }

    public function show($id) {
        $institution = Institution::findOrFail($id);


        return Inertia::render('InstitutionPage', [
            'institution' => $institution,
            'modalInitialData' => [
                'institution_id' => $institution->id,
                'institution_name' => $institution->name,
            ]
        ]);
    }
}
