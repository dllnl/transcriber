/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#667eea',
                    dark: '#764ba2',
                },
            },
            backgroundImage: {
                'gradient-brand': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }
        },
    },
    plugins: [],
}
