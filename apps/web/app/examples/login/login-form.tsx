"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@repo/schema";

export default function LoginForm() {
    const [result, setResult] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    });

    const onSubmit = async (values: LoginInput) => {
        setResult(null);

        const response = await fetch("http://localhost:4000/auth/login", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(values)
        });

        const payload = (await response.json()) as { data: unknown };
        setResult(JSON.stringify(payload, null, 2));
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "grid", gap: "1rem" }}
        >
            <label style={{ display: "grid", gap: "0.5rem" }}>
                Email
                <input
                    type="email"
                    {...register("email")}
                    style={{ padding: "0.5rem", border: "1px solid #ccc" }}
                />
                {errors.email ? (
                    <span style={{ color: "#b91c1c" }}>{errors.email.message}</span>
                ) : null}
            </label>

            <label style={{ display: "grid", gap: "0.5rem" }}>
                Password
                <input
                    type="password"
                    {...register("password")}
                    style={{ padding: "0.5rem", border: "1px solid #ccc" }}
                />
                {errors.password ? (
                    <span style={{ color: "#b91c1c" }}>{errors.password.message}</span>
                ) : null}
            </label>

            <button
                type="submit"
                disabled={isSubmitting}
                style={{
                    padding: "0.6rem 1rem",
                    border: "1px solid #111",
                    background: isSubmitting ? "#ddd" : "#111",
                    color: isSubmitting ? "#555" : "#fff",
                    cursor: isSubmitting ? "not-allowed" : "pointer"
                }}
            >
                {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            {result ? (
                <pre
                    style={{
                        background: "#f4f4f5",
                        padding: "1rem",
                        borderRadius: "8px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word"
                    }}
                >
                    {result}
                </pre>
            ) : null}
        </form>
    );
}
