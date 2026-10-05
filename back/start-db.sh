#!/bin/bash
set -e

# Asegurar que estamos en el directorio correcto
cd "$(dirname "$0")"

echo "Iniciando contenedor de PostgreSQL..."
docker compose up -d postgres

echo "Esperando a que PostgreSQL esté listo..."
# Intentar conectarse al contenedor hasta que responda
until docker exec megaprojects_postgres pg_isready -U user -d megaprojects > /dev/null 2>&1; do
  echo "PostgreSQL está cargando, esperando 2 segundos..."
  sleep 2
done

echo "¡PostgreSQL está listo!"

echo "Generando cliente de Prisma..."
npx prisma generate

echo "Ejecutando migraciones de Prisma..."
npx prisma migrate dev --name init_database

echo "Sembrando base de datos con datos iniciales..."
npx prisma db seed

echo "¡Base de datos lista, migrada y sembrada con éxito!"
