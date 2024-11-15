# MemoChat

MemoChat é uma aplicação projetada para personalizar a experiência do usuário, salvando informações enviadas por ele em um banco de dados vetorial. Através do uso de tecnologias de Inteligência Artificial, a aplicação organiza e armazena dados de interações com os usuários, permitindo um atendimento mais eficiente e relevante. A arquitetura do sistema é composta por diversos componentes que trabalham juntos para proporcionar uma experiência dinâmica e personalizada.

### A aplicação pode ser acessada em:  [34.42.238.213](http://34.42.238.213)

## Arquitetura

A arquitetura do MemoChat é composta pelas seguintes tecnologias:

- **Frontend**: HTML, CSS, JavaScript e Bootstrap.
- **Backend**: Python com **FastAPI**.
- **Banco de Dados**: **MongoDB** para armazenamento de dados.
- **Banco Vetorial**: **Weaviate** para armazenamento e consulta de dados vetoriais.
- **LLM** (Large Language Model): **Gemini**, do **Vertex AI** (Google Cloud).

## Instalação

### Pré-requisitos

- **Git**: Certifique-se de ter o [Git](https://git-scm.com/) instalado no seu sistema.
- **Docker e Docker Compose**: O Docker é necessário para executar os containers. Veja abaixo como instalar no Debian.

### Passos para Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/LeudoNeto/MemoChat.git
   ```

2. Entre no diretório do projeto:
   ```bash
   cd MemoChat
   ```

3. Renomeie o arquivo de exemplo `.env.example` para `.env`:
   ```bash
   mv .env.example .env
   ```

4. Preencha o arquivo `.env` com as credenciais necessárias:
   - `GOOGLE_APPLICATION_CREDENTIALS`: Caminho para suas credenciais dentro da pasta **ChatService**.
   - `TAVILY_API_KEY`: Sua chave de API do Tavily.

### Tutorial de Instalação do Docker no Debian

Para instalar o Docker no Debian, siga os passos abaixo:

1. Atualize os pacotes do sistema:
   ```bash
   sudo apt-get update
   ```

2. Instale dependências necessárias:
   ```bash
   sudo apt-get install apt-transport-https ca-certificates curl software-properties-common
   ```

3. Adicione a chave oficial do Docker:
   ```bash
   curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
   ```

4. Adicione o repositório Docker à sua lista de fontes:
   ```bash
   echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   ```

5. Atualize a lista de pacotes:
   ```bash
   sudo apt-get update
   ```

6. Instale o Docker:
   ```bash
   sudo apt-get install docker-ce docker-ce-cli containerd.io
   ```

7. Verifique se o Docker foi instalado corretamente:
   ```bash
   sudo docker --version
   ```

8. Instale o Docker Compose:
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/download/$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   ```

9. Torne o Docker Compose executável:
   ```bash
   sudo chmod +x /usr/local/bin/docker-compose
   ```

10. Verifique se o Docker Compose foi instalado corretamente:
    ```bash
    docker-compose --version
    ```

### Executando o Projeto

1. Para iniciar a aplicação, basta executar o seguinte comando:
   ```bash
   docker-compose up
   ```

2. A aplicação será iniciada e você pode acessá-la no [localhost](http://localhost)
