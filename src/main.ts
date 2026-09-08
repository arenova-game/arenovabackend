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
    .setDescription('Documentation officielle de la plateforme e-sport Arenova. Cette API gère le matchmaking, le portefeuille OVA, les preuves de victoire et les tournois.')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Entrez votre token Supabase',
      in: 'header',
    }, 'JWT-auth') // Changé le nom pour être plus explicite
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Arenova API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Serveur lancé sur : http://localhost:${port}`);
  console.log(`📖 Swagger documentation : http://localhost:${port}/api`);
}
bootstrap();
