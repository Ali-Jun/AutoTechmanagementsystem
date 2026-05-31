<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Service::query()->latest();

        if ($request->user()?->role !== 'admin') {
            $query->where('active', true);
        }

        return response()->json(['services' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:140'],
            'category' => ['required', 'string', 'max:80'],
            'duration' => ['required', 'string', 'max:40'],
            'price' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        $service = Service::create([...$data, 'active' => true]);

        return response()->json(['service' => $service], 201);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:140'],
            'category' => ['sometimes', 'string', 'max:80'],
            'duration' => ['sometimes', 'string', 'max:40'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $service->update($data);

        return response()->json(['service' => $service->fresh()]);
    }
}
