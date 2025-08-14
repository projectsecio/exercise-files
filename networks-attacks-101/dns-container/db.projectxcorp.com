$TTL    604800
@       IN      SOA     ns1.projectxcorp.com. admin.projectxcorp.com. (
                              2         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL
;
@       IN      NS      ns1.projectxcorp.com.
ns1     IN      A       10.0.0.8    
www     IN      A       10.0.0.8
