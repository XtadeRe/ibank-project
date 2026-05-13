<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Http\Requests\UserRequest;
use App\Http\Requests\LoginRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
class AuthController extends Controller
{
    public function store(UserRequest $request)
    {

        $data = $request->only(['login', 'phone', 'email']);
        $data['password'] = bcrypt($request->password);

        User::create($data);

        return redirect()->route('login')->with('message', 'Регистрация прошла успешно!');
    }

    public function login(LoginRequest $request) {

        $credentials = $request->validated();

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();
            return redirect()->intended(route('home'))
                ->with('success', 'Вы успешно вошли в систему!');
        }
        return back()->withErrors([
            'email' => 'Неверный email или пароль.',
        ])->onlyInput('email');

    }

    public function logout(Request $request) {
        Auth::logout();

        return redirect()->route('login')->with('message', 'Выход прошёл успешно!');
    }
}
