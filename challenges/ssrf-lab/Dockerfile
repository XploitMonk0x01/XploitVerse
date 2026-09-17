FROM php:apache

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install mysqli pdo pdo_mysql 2>/dev/null || true

COPY www/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html/

RUN echo "FLAG{xv_ssrf_vulnerable_lab_flag}" > /flag.txt && \
    echo "FLAG{xv_ssrf_vulnerable_lab_flag}" > /var/www/flag.txt

EXPOSE 80

CMD ["apache2-foreground"]
