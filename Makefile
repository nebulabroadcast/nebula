.PHONY: install uninstall
SYMLINKS = /usr/bin/nxa /usr/bin/nxt /usr/bin/nxs

install : $(SYMLINKS)

$(SYMLINKS):
	ln -s /opt/nebula/manage $@
