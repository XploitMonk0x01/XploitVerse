FROM nginx:alpine

# Copy XSS challenge suite to webroot
COPY index.html /usr/share/nginx/html/index.html
COPY labs /usr/share/nginx/html/labs

# Place standard flag
RUN echo "FLAG{xv_xss_labs_mastered}" > /usr/share/nginx/html/flag.txt && \
    echo "FLAG{xv_xss_labs_mastered}" > /flag.txt

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
