from app import create_app

# Cria a instância da aplicação usando a factory function que definimos em app/__init__.py
app = create_app()

if __name__ == '__main__':
    # Executa a aplicação
    # O modo debug é ótimo para desenvolvimento, mas deve ser False em produção.
    # O host 0.0.0.0 torna a aplicação acessível na sua rede local.
    app.run(debug=True, host='0.0.0.0', port=5000)
