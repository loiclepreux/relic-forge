import { apiFetch } from "./client";

export type User = {
    id: string;
    email: string;
};

type UserResponse = { user: User };

export async function fetchCurrentUser(): Promise<User> {
    return (await apiFetch<UserResponse>("/auth/me")).user;
}

export async function login(email: string, password: string): Promise<User> {
    return (
        await apiFetch<UserResponse>("/auth/login", {
            method: "POST",
            body: { email, password },
        })
    ).user;
}

export async function register(email: string, password: string): Promise<User> {
    return (
        await apiFetch<UserResponse>("/auth/register", {
            method: "POST",
            body: { email, password },
        })
    ).user;
}

export async function logout(): Promise<void> {
    await apiFetch("/auth/logout", { method: "POST" });
}
