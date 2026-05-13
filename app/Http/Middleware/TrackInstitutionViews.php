<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Institution;

class TrackInstitutionViews
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if ($request->route()->getName() === 'institutionPage' && $request->route('id')) {
            $institution = Institution::find($request->route('id'));
            if ($institution) {
                $sessionKey = 'viewed_institution_' . $institution->id;
                if (!$request->session()->has($sessionKey)) {
                    $institution->increment('views');
                    $request->session()->put($sessionKey, true);
                }
            }
        }
        return $response;
    }
}
