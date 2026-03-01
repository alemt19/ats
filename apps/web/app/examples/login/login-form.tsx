"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "../../../auth-client";
import { loginSchema } from "@repo/schema";
import { z } from "zod";

type LoginInput = z.infer<typeof loginSchema>;

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

        const response = await signIn.email({
            email: values.email,
            password: values.password,
        });

        if (response?.error) {
            setResult(
                JSON.stringify(
                    {
                        success: false,
                        error: "Credenciales inválidas o backend no disponible"
                    },
                    null,
                    2
                )
            );
            return;
        }

        setResult(
            JSON.stringify(
                {
                    success: true,
                        message: "Sesión iniciada con Better Auth"
                },
                null,
                2
            )
        );
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
