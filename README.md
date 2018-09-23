Nebula
======

Nebula is a media asset management and workflow automation system for TV and radio broadcast.

Key features
------------

 - media asset management, metadata handling
 - process automation (media conversion and analysis)
 - programme planning, scheduling
 - linear playout control ([CasparCG](http://www.casparcg.com) and [Liquidsoap](http://liquidsoap.fm))
 - VOD and pseudolinear output automation
 - web and social publishing
 - statistics, reporting

Installation
------------

See [nebula-setup](https://github.com/nebulabroadcast/nebula-setup)
for installation scripts and instructions.

After initial setup, use `make install` to create symlinks for command line utilities
and create your first user using `./manage.py adduser` command.

To start Nebula, open a screen session and run `./nebula.py` in one window
and `./manage run hub` (API server) in the second one.

Need help?
----------

Professional support for Nebula is provided by [Nebula Broadcast](https://nebulabroadcast.com)
