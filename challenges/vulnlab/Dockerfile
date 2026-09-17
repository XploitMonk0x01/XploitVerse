FROM yavuzlar/vulnlab:latest

COPY run.sh /usr/sbin/run.sh
RUN sed -i -e 's/\r$//' /usr/sbin/run.sh && \
    chmod +x /usr/sbin/run.sh

RUN echo "FLAG{xv_vulnlab_root_compromised}" > /flag.txt && \
    echo "FLAG{xv_vulnlab_root_compromised}" > /var/www/html/flag.txt

EXPOSE 80

CMD ["/usr/sbin/run.sh"]
