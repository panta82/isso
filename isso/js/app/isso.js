/* Isso – Ich schrei sonst!
 */
define(["app/dom", "app/utils", "app/config", "app/api", "app/jade", "app/i18n", "app/lib", "app/globals"],
    function($, utils, config, api, jade, i18n, lib, globals) {

    "use strict";

    var validateText = function(el, config) {
        if (utils.text(el.innerHTML).length < 3 || el.classList.contains("placeholder")) {
            el.classList.add('has-error');
            el.focus();
            return false;
        }
        return true;
    };

    var validateAuthor = function(el, config) {
        if (config["require-author"] && el.value.length <= 0) {
            el.classList.add('has-error');
            el.focus();
            return false;
        }
        return true;
    };

    var validateEmail = function(el, config) {
        if ((config["require-email"] && el.value.length <= 0) || (el.value.length && el.value.indexOf("@") < 0)) {
            el.classList.add('has-error');
            el.focus();
            return false;
        }
        return true;
    };

    var Postbox = function(server, parent) {

        var localStorage = utils.localStorageImpl,
            el = $.htmlify(jade.render("postbox", {
            "author":  JSON.parse(localStorage.getItem("author")),
            "password":  JSON.parse(localStorage.getItem("password")),
            "email":   JSON.parse(localStorage.getItem("email")),
            "website": JSON.parse(localStorage.getItem("website")),
            "preview": ''
        }));

        var inputs = {
            author: $("[name=author]", el),
            email: $("[name=email]", el),
            password: $("[name=password]", el),
            website: $("[name=website]", el),
            text: $(".textarea", el),
            submit: $("[type=submit]", el),
            preview: $("[name='preview']", el),
            edit: $("[name='edit']", el)
        };

        inputs.author.on(['change', 'keyup'], update);
        inputs.email.on(['change', 'keyup'], update);
        inputs.password.on(['change', 'keyup'], update);
        inputs.website.on(['change', 'keyup'], update);
        inputs.text.on(['change', 'keyup'], update);

        var passwordMode = false;

        // callback on success (e.g. to toggle the reply button)
        el.onsuccess = function() {};

        // email is not optional if this config parameter is set
        if (config["require-email"]) {
            inputs.email.placeholder.setAttribute("placeholder",
                inputs.email.placeholder.getAttribute("placeholder").replace(/ \(.*\)/, ""));
        }

        // author is not optional if this config parameter is set
        if (config["require-author"]) {
            inputs.author.placeholder = inputs.author.placeholder.replace(/ \(.*\)/, "");
        }

        // preview function
        inputs.preview.on("click", function() {
            api.preview(utils.text($(".textarea", el).innerHTML)).then(
                function(html) {
                    $(".preview .text", el).innerHTML = html;
                    el.classList.add('preview-mode');
                });
        });

        // edit function
        var edit = function() {
            $(".preview .text", el).innerHTML = '';
            el.classList.remove('preview-mode');
        };
        inputs.edit.on("click", edit);
        $(".preview", el).on("click", edit);

        // submit form, initialize optional fields with `null` and reset form.
        // If replied to a comment, remove form completely.
        inputs.submit.on("click", function() {
            edit();
            if (3 > Number(validateText(inputs.text, config)) +
                Number(validateAuthor(inputs.author, config)) +
                (passwordMode ? 1 : Number(validateEmail(inputs.email, config)))) {
                return;
            }

            var author = inputs.author.value || null,
                email = inputs.email.value || null,
                password = inputs.password.value || null,
                website = inputs.website.value || null;

            localStorage.setItem("author", JSON.stringify(author));
            localStorage.setItem("email", JSON.stringify(email));
            localStorage.setItem("password", JSON.stringify(password));
            localStorage.setItem("website", JSON.stringify(website));

            ['author', 'email', 'password', 'website', 'text'].forEach(function (key) {
                inputs[key].classList.remove("has-error");
            });

            api.create($("#isso-thread").getAttribute("data-isso-id"), {
                author: author, email: email, password: password, website: website,
                text: utils.text($(".textarea", el).innerHTML),
                parent: parent || null,
                title: $("#isso-thread").getAttribute("data-title") || null
            }).then(
                function(comment) {
                    inputs.text.innerHTML = "";
                    inputs.text.blur();
                    insert(comment, server, true);

                    if (parent !== null) {
                        el.onsuccess();
                    }
                },
                function (err) {
                    if (err.status === 401) {
                        inputs.password.classList.add('has-error');
                    } else {
                        console.error(err.message);
                    }
                }
            );
        });

        lib.editorify($(".textarea", el));

        update();

        return el;

        function update(e) {
            if (e) {
                e.target.classList.remove("has-error");
            }

            if (!e || e.target.name === "author") {
                var isKnownUser = server.users.indexOf(inputs.author.value) >= 0;
                if (isKnownUser && !passwordMode) {
                    el.classList.add('isso-postbox-password-mode');
                    passwordMode = true;
                }
                else if (!isKnownUser && passwordMode) {
                    el.classList.remove('isso-postbox-password-mode');
                    passwordMode = false;
                }
            }
        }
    };

    var insert_loader = function(comment, server, lastcreated) {
        var entrypoint;
        if (comment.id === null) {
            entrypoint = $("#isso-root");
            comment.name = 'null';
        } else {
            entrypoint = $("#isso-" + comment.id + " > .text-wrapper > .isso-follow-up");
            comment.name = comment.id;
        }
        var el = $.htmlify(jade.render("comment-loader", {"comment": comment}));

        entrypoint.append(el);

        $("a.load_hidden", el).on("click", function() {
            el.remove();
            api.fetch($("#isso-thread").getAttribute("data-isso-id"),
                config["reveal-on-click"], config["max-comments-nested"],
                comment.id,
                lastcreated).then(
                function(rv) {
                    if (rv.total_replies === 0) {
                        return;
                    }

                    var lastcreated = 0;
                    rv.replies.forEach(function(commentObject) {
                        insert(commentObject, server, false);
                        if(commentObject.created > lastcreated) {
                            lastcreated = commentObject.created;
                        }
                    });

                    if(rv.hidden_replies > 0) {
                        insert_loader(rv, server, lastcreated);
                    }
                },
                function(err) {
                    console.error(err);
                });
        });
    };

    var insert = function(comment, server, scrollIntoView) {
        var el = $.htmlify(jade.render("comment", {"comment": comment}));

        // update datetime every 60 seconds
        var refresh = function() {
            $(".permalink > time", el).textContent = utils.ago(
                globals.offset.localTime(), new Date(parseInt(comment.created, 10) * 1000));
            setTimeout(refresh, 60*1000);
        };

        // run once to activate
        refresh();

        if (config["avatar"]) {
            $("div.avatar > svg", el).replace(lib.identicons.generate(comment.hash, 4, 48));
        }

        var entrypoint;
        if (comment.parent === null) {
            entrypoint = $("#isso-root");
        } else {
            entrypoint = $("#isso-" + comment.parent + " > .text-wrapper > .isso-follow-up");
        }

        if (server.users && server.users.indexOf(comment.author) >= 0) {
            el.classList.add("isso-known-user");
            el.classList.add("isso-user-" + utils.slug(comment.author));
        }

        entrypoint.append(el);

        if (scrollIntoView) {
            el.scrollIntoView();
        }

        var footer = $("#isso-" + comment.id + " > .text-wrapper > .isso-comment-footer"),
            header = $("#isso-" + comment.id + " > .text-wrapper > .isso-comment-header"),
            text   = $("#isso-" + comment.id + " > .text-wrapper > .text");

        var form = null;  // XXX: probably a good place for a closure
        $("a.reply", footer).toggle("click",
            function(toggler) {
                form = footer.insertAfter(new Postbox(server, comment.parent === null ? comment.id : comment.parent));
                form.onsuccess = function() { toggler.next(); };
                $(".textarea", form).focus();
                $("a.reply", footer).textContent = i18n.translate("comment-close");
            },
            function() {
                form.remove();
                $("a.reply", footer).textContent = i18n.translate("comment-reply");
            }
        );

        if (config.vote) {
            var voteLevels = config['vote-levels'];
            if (typeof voteLevels === 'string') {
                // Eg. -5,5,15
                voteLevels = voteLevels.split(',');
            }
            
            // update vote counter
            var votes = function (value) {
                var span = $("span.votes", footer);
                if (span === null) {
                    footer.prepend($.new("span.votes", value));
                } else {
                    span.textContent = value;
                }
                if (value) {
                    el.classList.remove('isso-no-votes');
                } else {
                    el.classList.add('isso-no-votes');
                }
                if (voteLevels) {
                    var before = true;
                    for (var index = 0; index <= voteLevels.length; index++) {
                        if (before && (index >= voteLevels.length || value < voteLevels[index])) {
                            el.classList.add('isso-vote-level-' + index);
                            before = false;
                        } else {
                            el.classList.remove('isso-vote-level-' + index);
                        }
                    }
                }
            };

            $("a.upvote", footer).on("click", function () {
                api.like(comment.id).then(function (rv) {
                    votes(rv.likes - rv.dislikes);
                });
            });

            $("a.downvote", footer).on("click", function () {
                api.dislike(comment.id).then(function (rv) {
                    votes(rv.likes - rv.dislikes);
                });
            });
            
            votes(comment.likes - comment.dislikes);
        }

        $("a.edit", footer).toggle("click",
            function(toggler) {
                var edit = $("a.edit", footer);
                var avatar = config["avatar"] || config["gravatar"] ? $(".avatar", el, false)[0] : null;

                edit.textContent = i18n.translate("comment-save");
                edit.insertAfter($.new("a.cancel", i18n.translate("comment-cancel"))).on("click", function() {
                    toggler.canceled = true;
                    toggler.next();
                });

                toggler.canceled = false;
                api.view(comment.id, 1).then(function(rv) {
                    var textarea = lib.editorify($.new("div.textarea"));

                    textarea.innerHTML = utils.detext(rv.text);
                    textarea.focus();

                    text.classList.remove("text");
                    text.classList.add("textarea-wrapper");

                    text.textContent = "";
                    text.append(textarea);
                });

                if (avatar !== null) {
                    avatar.hide();
                }
            },
            function(toggler) {
                var textarea = $(".textarea", text);
                var avatar = config["avatar"] || config["gravatar"] ? $(".avatar", el, false)[0] : null;

                if (! toggler.canceled && textarea !== null) {
                    if (!validateText(textarea, config)) {
                        toggler.wait();
                        return;
                    }
                    api.modify(comment.id, {"text": utils.text(textarea.innerHTML)}).then(function(rv) {
                        text.innerHTML = rv.text;
                        comment.text = rv.text;
                    });
                } else {
                    text.innerHTML = comment.text;
                }

                text.classList.remove("textarea-wrapper");
                text.classList.add("text");

                if (avatar !== null) {
                    avatar.show();
                }

                $("a.cancel", footer).remove();
                $("a.edit", footer).textContent = i18n.translate("comment-edit");
            }
        );

        $("a.delete", footer).toggle("click",
            function(toggler) {
                var del = $("a.delete", footer);
                var state = ! toggler.state;

                del.textContent = i18n.translate("comment-confirm");
                del.on("mouseout", function() {
                    del.textContent = i18n.translate("comment-delete");
                    toggler.state = state;
                    del.onmouseout = null;
                });
            },
            function() {
                var del = $("a.delete", footer);
                api.remove(comment.id).then(function(rv) {
                    if (rv) {
                        el.remove();
                    } else {
                        $("span.note", header).textContent = i18n.translate("comment-deleted");
                        text.innerHTML = "<p>&nbsp;</p>";
                        $("a.edit", footer).remove();
                        $("a.delete", footer).remove();
                    }
                    del.textContent = i18n.translate("comment-delete");
                });
            }
        );

        // remove edit and delete buttons when cookie is gone
        var clear = function(button) {
            if (! utils.cookie("isso-" + comment.id)) {
                if ($(button, footer) !== null) {
                    $(button, footer).remove();
                }
            } else {
                setTimeout(function() { clear(button); }, 15*1000);
            }
        };

        clear("a.edit");
        clear("a.delete");

        // show direct reply to own comment when cookie is max aged
        var show = function(el) {
            if (utils.cookie("isso-" + comment.id)) {
                setTimeout(function() { show(el); }, 15*1000);
            } else {
                footer.append(el);
            }
        };

        if (! config["reply-to-self"] && utils.cookie("isso-" + comment.id)) {
            show($("a.reply", footer).detach());
        }

        if(comment.hasOwnProperty('replies')) {
            var lastcreated = 0;
            comment.replies.forEach(function(replyObject) {
                insert(replyObject, server, false);
                if(replyObject.created > lastcreated) {
                    lastcreated = replyObject.created;
                }

            });
            if(comment.hidden_replies > 0) {
                insert_loader(comment, server, lastcreated);
            }

        }

    };

    return {
        insert: insert,
        insert_loader: insert_loader,
        Postbox: Postbox
    };
});
