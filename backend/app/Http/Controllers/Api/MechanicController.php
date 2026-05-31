<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mechanic;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MechanicController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'mechanics' => Mechanic::with('user')->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:40'],
            'specialty' => ['required', 'string', 'max:120'],
            'bay' => ['required', 'string', 'max:40'],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => 'password',
            'role' => 'mechanic',
        ]);

        $mechanic = Mechanic::create([
            'user_id' => $user->id,
            'specialty' => $data['specialty'],
            'bay' => $data['bay'],
            'status' => 'Available',
            'rating' => $data['rating'] ?? 4.5,
        ]);

        return response()->json(['mechanic' => $mechanic->load('user')], 201);
    }
}
