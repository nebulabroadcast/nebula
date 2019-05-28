.PHONY: install uninstall

SYSDIR = /etc/systemd/system
NEBULADIR = /opt/nebula
SYMLINKS = /usr/bin/nxa /usr/bin/nxt /usr/bin/nxs /usr/bin/nxl /usr/bin/nxadduser
UNITS = $(SYSDIR)/nebula.service $(SYSDIR)/nebula-hub.service
UNITSSRC = $(NEBULADIR)/support/nebula.service $(NEBULADIR)/support/nebula-hub.service


install : $(SYMLINKS) $(UNITS)

$(SYMLINKS):
	ln -s /opt/nebula/manage.py $@

$(UNITS): $(UNITSSRC)
	cp $(NEBULADIR)/support/nebula.service $(SYSDIR)/nebula.service
	cp $(NEBULADIR)/support/nebula-hub.service $(SYSDIR)/nebula-hub.service
