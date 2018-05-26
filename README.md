#### Changes compared to the upstream

The following changes were made on branch panta-master:

- Removed limitation to the number of likes/dislikes
- Disabled anonimization (fixing the bloom filter bug)

#### Quick install reminder

Create virtual env
```
# After installing 3.6.1 using pyenv
pp-mk isso 3.6.1
```

In development:
```
python setup.py develop
nano ../isso.ini # Write settings here
./run.sh
```

In production
```
python setup.py install
# see in misc/deploy
```

--------------------------

The rest of this document is the same as on isso master

--------------------------

Isso – a commenting server similar to Disqus
============================================

Isso – *Ich schrei sonst* – is a lightweight commenting server written in
Python and JavaScript. It aims to be a drop-in replacement for
[Disqus](http://disqus.com).

![Isso in Action](http://posativ.org/~tmp/isso-sample.png)

See [posativ.org/isso](http://posativ.org/isso/) for more details.
