import LoginForm from "./login-form";

export default function LoginPage() {
    return (
        <main style={{ maxWidth: 440, margin: "4rem auto", padding: "0 1.5rem" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                Login
            </h1>
            <p style={{ marginBottom: "2rem", color: "#666" }}>
                Shared Zod schema validation from @repo/schema.
            </p>
            <LoginForm />
        </main>
    );
}
