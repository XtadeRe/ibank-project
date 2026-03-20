<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSandboxRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name' => 'required|string|unique:sandboxes,name',
            'git_branch' => 'required|string',
            'stack_type' => 'required|in:full,api,mysql',
            'machine_ip' => 'required|ip',
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'Название стека обязательно',
            'name.unique' => 'Стек с таким именем уже существует',
            'git_branch.required' => 'Укажите ветку Git',
            'stack_type.required' => 'Выберите тип стека',
            'stack_type.in' => 'Тип стека должен быть: full, api или mysql',
            'machine_ip.required' => 'Укажите IP машины',
            'machine_ip.ip' => 'Укажите корректный IP адрес',
        ];
    }
}
