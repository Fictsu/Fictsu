FROM    node:20.15.0 AS build
WORKDIR /app
COPY    package*.json ./
RUN     npm ci
COPY    . ./
RUN     npm run build

FROM    node:20.15.0 AS production
WORKDIR /app
COPY    --from=build /app/public ./public
COPY    --from=build /app/.next/standalone ./
COPY    --from=build /app/.next/static ./.next/static
CMD     ["node", "server.js"]
