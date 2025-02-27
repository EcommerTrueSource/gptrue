import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SensitiveDataInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SensitiveDataInterceptor.name);

  // Padrões para identificar dados sensíveis
  private readonly sensitivePatterns = {
    apiKey: /(['"]\w*api[_-]?key['"]:\s*['"])[^'"]+(['"])/gi,
    privateKey: /(-----BEGIN PRIVATE KEY-----\n)[^-]+(-----END PRIVATE KEY-----)/g,
    password: /(['"]password['"]:\s*['"])[^'"]+(['"])/gi,
    email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    jwt: /eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g,
    clerk: {
      secretKey: /sk_test_[a-zA-Z0-9]{32,}/g,
      publishableKey: /pk_test_[a-zA-Z0-9]{32,}/g,
      webhookSecret: /whsec_[a-zA-Z0-9]{32,}/g
    },
    openai: {
      apiKey: /sk-[a-zA-Z0-9]{48,}/g
    },
    pinecone: {
      apiKey: /pcsk_[a-zA-Z0-9]{64,}/g
    }
  };

  // Função para mascarar dados sensíveis
  private maskSensitiveData(data: any): any {
    if (!data) return data;

    // Se for string, aplicar mascaramento
    if (typeof data === 'string') {
      let maskedData = data;

      // Mascarar chaves API
      maskedData = maskedData.replace(this.sensitivePatterns.apiKey, '$1***$2');

      // Mascarar private keys
      maskedData = maskedData.replace(this.sensitivePatterns.privateKey, '$1***$2');

      // Mascarar senhas
      maskedData = maskedData.replace(this.sensitivePatterns.password, '$1***$2');

      // Mascarar emails (preservar domínio)
      maskedData = maskedData.replace(this.sensitivePatterns.email, (email) => {
        const [local, domain] = email.split('@');
        return `${local.charAt(0)}***@${domain}`;
      });

      // Mascarar JWTs
      maskedData = maskedData.replace(this.sensitivePatterns.jwt, 'JWT_***');

      // Mascarar chaves Clerk
      maskedData = maskedData
        .replace(this.sensitivePatterns.clerk.secretKey, 'sk_test_***')
        .replace(this.sensitivePatterns.clerk.publishableKey, 'pk_test_***')
        .replace(this.sensitivePatterns.clerk.webhookSecret, 'whsec_***');

      // Mascarar chave OpenAI
      maskedData = maskedData.replace(this.sensitivePatterns.openai.apiKey, 'sk-***');

      // Mascarar chave Pinecone
      maskedData = maskedData.replace(this.sensitivePatterns.pinecone.apiKey, 'pcsk_***');

      return maskedData;
    }

    // Se for objeto, processar recursivamente
    if (typeof data === 'object') {
      const maskedObject = Array.isArray(data) ? [] : {};

      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          // Pular mascaramento para alguns campos específicos
          if (['id', 'createdAt', 'updatedAt'].includes(key)) {
            maskedObject[key] = data[key];
            continue;
          }

          // Mascarar campos sensíveis conhecidos
          if (['password', 'apiKey', 'privateKey', 'secret', 'token'].includes(key)) {
            maskedObject[key] = '***';
            continue;
          }

          // Processar recursivamente outros campos
          maskedObject[key] = this.maskSensitiveData(data[key]);
        }
      }

      return maskedObject;
    }

    return data;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Obter a requisição
    const request = context.switchToHttp().getRequest();
    const { body, query, params } = request;

    // Mascarar dados sensíveis na requisição para logs
    const maskedRequest = {
      body: this.maskSensitiveData(body),
      query: this.maskSensitiveData(query),
      params: this.maskSensitiveData(params)
    };

    // Log da requisição mascarada
    this.logger.debug(`Request: ${JSON.stringify(maskedRequest)}`);

    // Processar a resposta
    return next.handle().pipe(
      map(data => {
        // Mascarar dados sensíveis na resposta para logs
        const maskedResponse = this.maskSensitiveData(data);

        // Log da resposta mascarada
        this.logger.debug(`Response: ${JSON.stringify(maskedResponse)}`);

        // Retornar dados originais (não mascarados) para o cliente
        return data;
      })
    );
  }
}
