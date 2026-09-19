#!/bin/bash

# Fix permissions
mkdir -p /var/run/mysqld
chown -R mysql:mysql /var/run/mysqld /var/lib/mysql 2>/dev/null || true

# Fix php ini
for ini in /etc/php/*/apache2/php.ini; do
    if [ -f "$ini" ]; then
        sed -i "s/short_open_tag = Off/short_open_tag = On/g" "$ini"
        sed -i "s/\;date\.timezone\ \=/date\.timezone\ \=\ UTC/" "$ini"
    fi
done

# Start MariaDB service
service mysql start || /usr/bin/mysqld_safe &
sleep 4

mysql -u root -e "CREATE DATABASE IF NOT EXISTS sql_injection;" 2>/dev/null || true
if [ -f /var/www/html/lab/sql-injection/dump.sql ]; then
    mysql -u root sql_injection < /var/www/html/lab/sql-injection/dump.sql 2>/dev/null || true
fi
mysql -u root -e "CREATE USER IF NOT EXISTS 'sql_injection'@'localhost' IDENTIFIED BY '';" 2>/dev/null || true
mysql -u root -e "GRANT ALL PRIVILEGES ON * . * TO 'sql_injection'@'localhost';" 2>/dev/null || true

echo "VulnLab starting Apache..."
/usr/sbin/apachectl -D FOREGROUND
