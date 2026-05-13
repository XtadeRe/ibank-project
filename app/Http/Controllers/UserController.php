<?php

namespace App\Http\Controllers;

use App\Models\Bid;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index() {

        $user = User::where('id', auth()->id())->first();
        $bids = Bid::where('user_id', auth()->id())->count();

        return Inertia::render('Profile', [
            'user' => $user,
            'bids' => $bids
        ]);
    }

    public function updatePhone(Request $request) {
        $user = User::where('id', auth()->id())->first();

        $user->update(['phone' => $request->phone]);
        $user->save();

        return redirect()->back()->with('success', 'Телефон успешно обновлен');

    }

    public function bids() {
        $bidsWithInstitutions = Bid::with('institution')->where('user_id', auth()->id())->orderBy('created_at', 'desc')->get();

        return Inertia::render('ProfilePages/MyBids', [
            'bids' => $bidsWithInstitutions
        ]);
    }

    public function updateBidStatus(Request $request, $id) {
        $bid = Bid::where('id', $id)->where('user_id', auth()->id())->firstOrFail();

        if (in_array($bid->status, ['approved', 'completed'])) {
            return back()->with('error', 'Нельзя отменить уже одобренную или завершенную заявку');
        }

        $bid->update([
            'status' => $request->status,
            'institution_status' => $request->status 
        ]);

        \Log::info('Статус изменён', [
            'user_id' => auth()->id(),
            'bid_id' => $bid->id,
            'institution_id' => $bid->institution_id,
        ]);

        return redirect()->back()->with('success', 'Статус заявки успешно изменён');
    }
}
