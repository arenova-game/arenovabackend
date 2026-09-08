import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Activer le CORS pour que le Backoffice et le Mobile puissent appeler l'API
  app.enableCors();

  // --- CONFIGURATION SWAGGER ---
  const config = new DocumentBuilder()
    .setTitle('ARENOVA API')
    .setDescription('Documentation officielle de la plateforme e-sport Arenova')
    .setVersion('1.0')
    .addBearerAuth() // Pour les routes sécurisées avec JWT Supabase
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Arenova API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Serveur lancé sur : http://localhost:${port}`);
  console.log(`📖 Swagger documentation : http://localhost:${port}/api`);
}
bootstrap();
