require.config({
    paths: {
        "threejs": "/nbextensions/pythreejs/three.js/build/three",
        "threejs-orbit": "/nbextensions/pythreejs/three.js/examples/js/controls/OrbitControls",
        "threejs-trackball": "/nbextensions/pythreejs/three.js/examples/js/controls/TrackballControls",
        "threejs-detector": "/nbextensions/pythreejs/three.js/examples/js/Detector",
    },
    shim: {
        "threejs-orbit": {deps: ["threejs"]},
        "threejs-trackball": {deps: ["threejs"]},
        "threejs-detector": {deps: ["threejs"]},
        "threejs": {exports: "THREE"}
    },
});

define(["widgets/js/widget", "widgets/js/manager", "base/js/utils", "threejs", "threejs-trackball", "threejs-orbit", "threejs-detector"], function(widget, manager, utils, THREE) {
    console.log("loading pythreejs");
    var RendererView = widget.DOMWidgetView.extend({
        render : function(){
            console.log('created renderer');
            var width = this.model.get('width');
            var height = this.model.get('height');
            var that = this;
            this.id = utils.uuid();
            var render_loop = {register_update: function(fn, context) {that.on('animate:update', fn, context);},
                               render_frame: function () {that._render = true; that.schedule_update()},
                               renderer_id: this.id}
            if ( Detector.webgl )
                this.renderer = new THREE.WebGLRenderer( {antialias:true, alpha: true} );
            else
                this.renderer = new THREE.CanvasRenderer();
            this.$el.empty().append( this.renderer.domElement );
            this.camera = this.create_child_view(this.model.get('camera'),
                                                render_loop);
            this.scene = this.create_child_view(this.model.get('scene'),
                                               render_loop);
            this.scene.obj.add(this.camera.obj);
            console.log('renderer', this.model, this.scene.obj, this.camera.obj);
            this.update();
            this._animation_frame = false
            this.controls = _.map(this.model.get('controls'), function(m) {return this.create_child_view(m,
                     _.extend({},
                              {dom: this.renderer.domElement,
                               start_update_loop: function() {that._update_loop = true; that.schedule_update();},
                               end_update_loop: function() {that._update_loop = false;},
                               renderer: this},
                              render_loop))}, this);
;
            this._render = true;
            this.schedule_update();
            window.r = this;
        },
        schedule_update: function() {
            if (!this._animation_frame) {
                this._animation_frame = requestAnimationFrame(_.bind(this.animate, this))
            }
        },
        animate: function() {
            this._animation_frame = false;
            if (this._update_loop) {
                this.schedule_update();
            }
            this.trigger('animate:update', this);
            if (this._render) {
                this.effectrenderer.render(this.scene.obj, this.camera.obj)
                this._render = false;
            }
        },
        update : function(){
            console.log('update renderer', this.scene.obj, this.camera.obj);
            if (this.model.get('effect')) {
                this.effect = this.create_child_view(this.model.get('effect'), {renderer: this.renderer});
                this.effectrenderer = this.effect.obj;
            } else {
                this.effectrenderer = this.renderer;
            }
            console.log(this.effect, this.model);
            this.effectrenderer.setSize(this.model.get('width'),
                                        this.model.get('height'));
            if (this.model.get('color')) {
                this.effectrenderer.setClearColor(this.model.get('color'))
            }
            return widget.DOMWidgetView.prototype.update.call(this);
        },
    });
    register['RendererView'] = RendererView;

    var ThreeView = widget.WidgetView.extend({
        initialize: function () {
            widget.WidgetView.prototype.initialize.apply(this, arguments);
            this.new_properties();
        },

        render: function() {
            this.obj = this.new_obj();
            this.register_object_parameters();
            this.update();
            // pickers need access to the model from the three.js object
            this.obj.pythreejs_view = this;
            return this.obj;
        },
        new_properties: function() {
            // initialize properties arrays
            this.array_properties = [];
            this.scalar_properties = [];
            this.enum_properties = [];
            this.set_properties = []; // properties we set using the set method
            this.child_properties = [];
            // TODO: handle submodel properties?
        },
        update: function() {
            //this.replace_obj(this.new_obj());
            //this.update_object_parameters();
            this.needs_update();
        },

        replace_obj: function(new_obj) {
            var old_obj = this.obj;
            this.obj = new_obj;
            this.obj.pythreejs_view = this;
            this.update_object_parameters();
            this.trigger('replace_obj', old_obj, new_obj);
        },
        new_obj: function() {
        },

        needs_update: function() {
            this.obj.needsUpdate = true;
            this.trigger('rerender');
        },
        register_object_parameters: function() {
            var array_properties = this.array_properties;
            var updates = this.updates = {};
            // first, we create update functions for each attribute
            _.each(this.array_properties, function(p) {
                updates[p] = function(t, value) {
                    if (value.length !== 0) {
                        // the default is the empty list, 
                        // and we don't act in that case
                        t.obj[p].fromArray(value);
                    }
                }});

            _.each(this.scalar_properties, function(p) {
                updates[p] = function(t, value) {
                    t.obj[p] = value;
                }});

            _.each(this.enum_properties, function(p) {
                updates[p] = function(t, value) {
                    t.obj[p] = THREE[value];
                }});

            _.each(this.set_properties, function(p) {
                updates[p] = function(t, value) {
                    t.obj[p].set(value);
                }});

            _.each(this.child_properties, function(p) {
                updates[p] = function(t, value) {
                    if (value) {
                        if (t[p]) {
                            t[p].off('replace_obj', null, t);
                        }
                        t[p] = t.create_child_view(value, t.options[p]);
                        t[p].on('replace_obj', function() {t.obj[p] = t[p].obj; t.needs_update()}, t);
                        t.obj[p] = t[p].obj;
                    }
                }});

            // next, we call and then register the update functions to changes
            _.each(updates, function(update, p) {
                update(this, this.model.get(p));
                this.model.on('change:'+p, function(model, value, options) {update(this, value)}, this);
            }, this);
        },
        update_object_parameters: function() {
            _.each(this.updates, function(update, p) {
                update(this, this.model.get(p));
            }, this);
        }
    });

    var AnaglyphEffectView = ThreeView.extend({
        new_obj: function() {
        return new THREE.AnaglyphEffect( this.options.renderer );
        }
    })
    register['AnaglyphEffectView'] = AnaglyphEffectView;

    var Object3dView = ThreeView.extend({
        new_properties: function() {
            ThreeView.prototype.new_properties.call(this);
            this.array_properties.push('position', 'quaternion', 'up', 'scale');
            this.scalar_properties.push('visible', 'castShadow', 'receiveShadow');
        },
        update_children: function(oldchildren, newchildren) {
            var that = this;
            this.do_diff(oldchildren || [], newchildren, 
                         function(deleted) {
                             var view = that.pop_child_view(deleted);
                             that.obj.remove(view.obj);
                             that.stopListening(view);
                             view.remove();
                         },
                         function(added) {
                             var view = that.create_child_view(added, _.pick(that.options,'register_update', 'renderer_id'));
                             that.obj.add(view.obj);
                             that.listenTo(view, 'replace_obj', that.replace_child_obj);
                             that.listenTo(view, 'rerender', that.needs_update);
                         });
        },
        new_obj: function() {
            return new THREE.Object3D();
        },
        update: function() {
            if (this.model.hasChanged('children')) {
                this.update_children(this.model.previous('children'), this.model.get('children'));
            }
            ThreeView.prototype.update.call(this);
        },

        replace_child_obj: function(old_obj, new_obj) {
            this.obj.remove(old_obj);
            this.obj.add(new_obj);
            this.needs_update()
        },
    });
    register['Object3dView'] = Object3dView;

    var ScaledObjectView = Object3dView.extend({
        render: function() {
            this.options.register_update(this.update_scale, this);
            Object3dView.prototype.render.call(this);
        },
        update_scale: function(renderer) {
            var s = renderer.camera.obj.position.length()/10;
            // one unit is about 1/10 the size of the window
            this.obj.scale.set(s,s,s);
        }
    });
    register['ScaledObjectView'] = ScaledObjectView;

    var CameraView = Object3dView.extend({
        new_obj: function() {
            return new THREE.Camera();
        },
        needs_update: function() {
            this.obj.updateProjectionMatrix();
            this.options.render_frame();
        }
    });
    register['CameraView'] = CameraView;

    var PerspectiveCameraView = CameraView.extend({
        new_properties: function() {
            CameraView.prototype.new_properties.call(this);
            this.scalar_properties.push('fov', 'aspect', 'near', 'far');
        },
        new_obj: function() {
            return new THREE.PerspectiveCamera(this.model.get('fov'),
                                                this.model.get('aspect'),
                                                this.model.get('near'),
                                                this.model.get('far'));
        }
    });
    register['PerspectiveCameraView'] = PerspectiveCameraView;

    var OrthographicCameraView = CameraView.extend({
        new_properties: function() {
            CameraView.prototype.new_properties.call(this);
            this.scalar_properties.push('left', 'right', 'top', 'bottom', 'near', 'far');
        },
        new_obj: function() {
            return new THREE.OrthographicCamera(this.model.get('left'),
                                                this.model.get('right'),
                                                this.model.get('top'),
                                                this.model.get('bottom'),
                                                this.model.get('near'),
                                                this.model.get('far'));
        }
    });
    register['OrthographicCameraView'] = OrthographicCameraView;

    var OrbitControlsView = ThreeView.extend({
        render: function() {
            // get the view that is tied to the same renderer
            this.controlled_view = _.find(this.model.get('controlling').views, function(o) {
                return o.options.renderer_id === this.options.renderer_id
            }, this);
            this.obj = new THREE.OrbitControls(this.controlled_view.obj, this.options.dom);
            this.options.register_update(this.obj.update, this.obj);
            this.obj.addEventListener('change', this.options.render_frame);
            this.obj.addEventListener('start', this.options.start_update_loop);
            this.obj.addEventListener('end', this.options.end_update_loop);
            // if there is a three.js control change, call the animate function to animate at least one more time
            delete this.options.renderer;
        }
    });
    register['OrbitControlsView'] = OrbitControlsView;

    var PickerView = ThreeView.extend({
        render: function() {
            var that = this;
            this.options.dom.addEventListener(this.model.get('event'), function(event) {
                var offset = $(this).offset();
                var mouseX = ((event.pageX - offset.left) / $(that.options.dom).width()) * 2 - 1;
                var mouseY = -((event.pageY - offset.top) / $(that.options.dom).height()) * 2 + 1;
                var vector = new THREE.Vector3(mouseX, mouseY, that.options.renderer.camera.obj.near);

                var projector = new THREE.Projector();
                projector.unprojectVector(vector, that.options.renderer.camera.obj);
                var ray = vector.sub(that.options.renderer.camera.obj.position).normalize();
                that.obj = new THREE.Raycaster(that.options.renderer.camera.obj.position, ray);
                var root = that.options.renderer.scene.obj;
                if (that.model.get('root')) {
                    var r = _.find(that.model.get('root').views, function(o) {
                        return o.options.renderer_id === that.options.renderer_id;
                    });
                    root = r.obj;
                }
                var objs = that.obj.intersectObject(root, true);
                var getinfo = function(o) {
                    var v = o.object.geometry.vertices;
                    var verts = [[v[o.face.a].x, v[o.face.a].y, v[o.face.a].z],
                                 [v[o.face.b].x, v[o.face.b].y, v[o.face.b].z],
                                 [v[o.face.c].x, v[o.face.c].y, v[o.face.c].z]]
                    return {point: [o.point.x, o.point.y, o.point.z],
                            distance: o.distance,
                            face: [o.face.a, o.face.b, o.face.c],
                            faceVertices: verts,
                            faceNormal: [o.face.normal.x, o.face.normal.y, o.face.normal.z],
                            faceIndex: o.faceIndex,
                            object: o.object.pythreejs_view.model
                           }
                }
                if(objs.length > 0) {
                    // perhaps we should set all attributes to null if there are
                    // no intersections?
                    var o = getinfo(objs[0]);
                    that.model.set('point', o.point);
                    that.model.set('distance', o.distance);
                    that.model.set('face', o.face);
                    that.model.set('faceVertices', o.faceVertices);
                    that.model.set('faceNormal', o.faceNormal);
                    that.model.set('object', o.object);
                    that.model.set('faceIndex', o.faceIndex);
                    if (that.model.get('all')) {
                        that.model.set('picked', _.map(objs, getinfo));
                    }
                    that.touch();
                }
            });
        }
    });
    register['PickerView'] = PickerView;


    var SceneView = Object3dView.extend({
        new_obj: function() {return new THREE.Scene();},
        needs_update: function() {this.options.render_frame();}
    });
    register['SceneView'] = SceneView;



    var SurfaceGeometryView = ThreeView.extend({
        update: function() {
            var obj = new THREE.PlaneGeometry(this.model.get('width'),
                                              this.model.get('height'),
                                              this.model.get('width_segments'),
                                              this.model.get('height_segments'));
            // PlaneGeometry constructs its vertices by going across x coordinates, starting from the maximum y coordinate
            var z = this.model.get('z');
            for (var i = 0, len = obj.vertices.length; i<len; i++) {
                obj.vertices[i].z = z[i];
            }
            obj.computeFaceNormals();
            obj.computeVertexNormals();
            this.replace_obj(obj);
        },
    });
    register['SurfaceGeometryView'] = SurfaceGeometryView;

    var PlainGeometryView = ThreeView.extend({
        update: function() {
            var geometry = new THREE.Geometry();
            var vertices = this.model.get('vertices');
            var faces = this.model.get('faces');
            var colors = this.model.get('colors');
            var faceVertexUvs = this.model.get('faceVertexUvs')

            var i, len;
            var f;
            for(i = 0, len=vertices.length; i<len; i+=1) {
                geometry.vertices.push((new THREE.Vector3()).fromArray(vertices[i]));
            }
            for(i=0, len=faces.length; i<len; i+=1) {
                f = faces[i];
                geometry.faces.push(new THREE.Face3(f[0], f[1], f[2]));
            }
            for(i=0, len=colors.length; i<len; i+=1) {
                geometry.colors.push(new THREE.Color(colors[i]));
            }
            // TODO: faceVertexUvs
	    geometry.verticesNeedUpdate = true;
	    geometry.elementsNeedUpdate = true;
	    geometry.uvsNeedUpdate = true;
	    geometry.normalsNeedUpdate = true;
	    geometry.tangentsNeedUpdate = true;
	    geometry.colorsNeedUpdate = true;
	    geometry.lineDistancesNeedUpdate = true;
            this.replace_obj(geometry);
        },
    });
    register['PlainGeometryView'] = PlainGeometryView;

    var FaceGeometryView = ThreeView.extend({

        update: function() {
            // Construct triangles
            var geometry = new THREE.Geometry();
            var vertices = this.model.get('vertices');
            var face3 = this.model.get('face3');
            var face4 = this.model.get('face4');
            var facen = this.model.get('facen');
            var face;
            var i, f, len, lenf;
            var v0, v1, v2;
            var f0,f1,f2,f3;
            for(i = 0, len=vertices.length; i<len; i+=3) {
                v0=vertices[i]; v1=vertices[i+1]; v2=vertices[i+2];
                geometry.vertices.push(new THREE.Vector3(v0, v1, v2));
            }
            for(i=0, len=face3.length; i<len; i+=3) {
                f0 = face3[i]; f1 = face3[i+1]; f2=face3[i+2];
                geometry.faces.push(new THREE.Face3(f0, f1, f2));
            }
            for(i=0, len=face4.length; i<len; i+=4) {
                f0=face4[i]; f1=face4[i+1]; f2=face4[i+2]; f3=face4[i+3];
                geometry.faces.push(new THREE.Face3(f0, f1, f2));
                geometry.faces.push(new THREE.Face3(f0, f2, f3));
            }
            for(i=0, len=facen.length; i<len; i++) {
                face = facen[i];
                f0 = face[0];
                for(f=1, lenf=face.length-1; f<lenf; f++) {
                    geometry.faces.push(new THREE.Face3(f0, face[f], face[f+1]));
                }
            }
            geometry.mergeVertices();
            geometry.computeFaceNormals();
            geometry.computeVertexNormals();
            geometry.computeBoundingSphere();
            this.replace_obj(geometry);
        }
    });
    register['FaceGeometryView'] = FaceGeometryView;


    var SphereGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.SphereGeometry(this.model.get('radius'), 32,16));
        }
    });
    register['SphereGeometryView'] = SphereGeometryView;

    var CylinderGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.CylinderGeometry(this.model.get('radiusTop'),
                                                        this.model.get('radiusBottom'),
                                                        this.model.get('height'),
                                                        this.model.get('radiusSegments'),
                                                        this.model.get('heightSegments'),
                                                        this.model.get('openEnded')));
        }
    });
    register['CylinderGeometryView'] = CylinderGeometryView;

    var BoxGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.BoxGeometry(this.model.get('width'),
                                                        this.model.get('height'),
                                                        this.model.get('depth'),
                                                        this.model.get('widthSegments'),
                                                        this.model.get('heightSegments'),
                                                        this.model.get('depthSegments')));
        }
    });
    register['BoxGeometryView'] = BoxGeometryView;

    var CircleGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.CircleGeometry(this.model.get('radius'),
                                                        this.model.get('segments'),
                                                        this.model.get('thetaStart'),
                                                        this.model.get('thetaLength')));
        }
    });
    register['CircleGeometryView'] = CircleGeometryView;

    var LatheGeometryView = ThreeView.extend({
        update: function() {
            var points = this.model.get('points');
            var pnt = [];
            for (var p_index = 0, len = points.length; p_index < len; p_index++ ) {
                var a = new THREE.Vector3().fromArray(points[p_index]);
                pnt.push(a);
            }
            this.replace_obj(new THREE.LatheGeometry(pnt,
                                                        this.model.get('segments'),
                                                        this.model.get('phiStart'),
                                                        this.model.get('phiLength')));
        }
    });
    register['LatheGeometryView'] = LatheGeometryView;

    var TubeGeometryView = ThreeView.extend({
        update: function() {
            var points = this.model.get('path');
            var pnt = [];
            for (var p_index = 0, len = points.length; p_index < len; p_index++ ) {
                var a = new THREE.Vector3().fromArray(points[p_index]);
                pnt.push(a);
            }
            var path = new THREE.SplineCurve3(pnt);
            this.replace_obj(new THREE.TubeGeometry(path,
                                                        this.model.get('segments'),
                                                        this.model.get('radius'),
                                                        this.model.get('radialSegments'),
                                                        this.model.get('closed')));
        }
    });
    register['TubeGeometryView'] = TubeGeometryView;

    var IcosahedronGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.IcosahedronGeometry(this.model.get('radius'),
                                                        this.model.get('detail')));
        }
    });
    register['IcosahedronGeometryView'] = IcosahedronGeometryView;

    var OctahedronGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.OctahedronGeometry(this.model.get('radius'),
                                                        this.model.get('detail')));
        }
    });
    register['OctahedronGeometryView'] = OctahedronGeometryView;

    var PlaneGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.PlaneGeometry(this.model.get('width'),
                                                        this.model.get('height'),
                                                        this.model.get('widthSegments'),
                                                        this.model.get('heightSegments')));
        }
    });
    register['PlaneGeometryView'] = PlaneGeometryView;

    var TetrahedronGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.TetrahedronGeometry(this.model.get('radius'),
                                                        this.model.get('detail')));
        }
    });
    register['TetrahedronGeometryView'] = TetrahedronGeometryView;

    var TorusGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.TorusGeometry(this.model.get('radius'),
                                                        this.model.get('tube'),
                                                        this.model.get('radialSegments'),
                                                        this.model.get('tubularSegments'),
                                                        this.model.get('arc')));
        }
    });
    register['TorusGeometryView'] = TorusGeometryView;

    var TorusKnotGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.TorusKnotGeometry(this.model.get('radius'),
                                                        this.model.get('tube'),
                                                        this.model.get('radialSegments'),
                                                        this.model.get('tubularSegments'),
                                                        this.model.get('p'),
                                                        this.model.get('q'),
                                                        this.model.get('heightScale')));
        }
    });
    register['TorusKnotGeometryView'] = TorusKnotGeometryView;

    var PolyhedronGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.PolyhedronGeometry(this.model.get('vertices'),
                                                          this.model.get('faces'),
                                                          this.model.get('radius'),
                                                          this.model.get('detail')));
        }
    });
    register['PolyhedronGeometryView'] = PolyhedronGeometryView;

    var RingGeometryView = ThreeView.extend({
        update: function() {
            this.replace_obj(new THREE.RingGeometry(this.model.get('innerRadius'),
                                                    this.model.get('outerRadius'),
                                                    this.model.get('thetaSegments'),
                                                    this.model.get('phiSegments'),
                                                    this.model.get('thetaStart'),
                                                    this.model.get('thetaLength')));
        }
    });
    register['RingGeometryView'] = RingGeometryView;

    var ParametricGeometryView = ThreeView.extend({
        update: function() {
            eval('var s='.concat(this.model.get('func')));
            this.replace_obj(new THREE.ParametricGeometry(s,
                                                    this.model.get('slices'),
                                                    this.model.get('stacks')));
        }
    });
    register['ParametricGeometryView'] = ParametricGeometryView;
    
    var MaterialView = ThreeView.extend({
        new_properties: function() {
            ThreeView.prototype.new_properties.call(this);
            this.enum_properties.push('side', 'blending', 'blendSrc', 'blendDst', 'blendEquation');
            this.scalar_properties.push('opacity', 'transparent', 'depthTest', 'depthWrite', 'polygonOffset',
                                        'polygonOffsetFactor', 'polygonOffsetUnits', 'overdraw', 'visible');
        },
        new_obj: function() {return new THREE.Material();},
    });
    register['MaterialView'] = MaterialView;

    var BasicMaterialView = MaterialView.extend({
        new_properties: function() {
            MaterialView.prototype.new_properties.call(this);
            this.enum_properties.push('shading', 'vertexColors');
            this.set_properties.push('color');
            this.scalar_properties.push('wireframe', 'wireframeLinewidth', 'wireframeLinecap', 'wireframeLinejoin',
                                        'fog', 'skinning', 'morphTargets');
            this.child_properties.push('map', 'lightMap', 'specularMap', 'envMap');
        },
        new_obj: function() {return new THREE.MeshBasicMaterial();}
    });
    register['BasicMaterialView'] = BasicMaterialView;

    var LambertMaterialView = BasicMaterialView.extend({
        new_properties: function() {
            BasicMaterialView.prototype.new_properties.call(this);
            this.enum_properties.push('combine');
            this.set_properties.push('ambient', 'emissive');
            this.scalar_properties.push('reflectivity', 'refractionRatio');
        },
        new_obj: function() {return new THREE.MeshLambertMaterial();}
    });
    register['LambertMaterialView'] = LambertMaterialView;

    var PhongMaterialView = BasicMaterialView.extend({
        new_properties: function() {
            BasicMaterialView.prototype.new_properties.call(this);
            this.enum_properties.push('combine');
            this.set_properties.push('ambient', 'emissive', 'specular');
            this.scalar_properties.push('shininess', 'reflectivity', 'refractionRatio');
        },
        new_obj: function() {return new THREE.MeshPhongMaterial();}
    });
    register['PhongMaterialView'] = PhongMaterialView;

    var DepthMaterialView = MaterialView.extend({
        new_properties: function() {
            MaterialView.prototype.new_properties.call(this);
            this.scalar_properties.push('wireframe', 'wireframeLinewidth');
        },
        new_obj: function() {return new THREE.MeshDepthMaterial();}
    });
    register['DepthMaterialView'] = DepthMaterialView;

    var LineBasicMaterialView = MaterialView.extend({
        new_properties: function() {
            MaterialView.prototype.new_properties.call(this);
            this.enum_properties.push('vertexColors');
            this.set_properties.push('color');
            this.scalar_properties.push('linewidth', 'fog', 'linecap', 'linejoin');
        },
        new_obj: function() {return new THREE.LineBasicMaterial();}
    });
    register['LineBasicMaterialView'] = LineBasicMaterialView;

    var LineDashedMaterialView = MaterialView.extend({
        new_properties: function() {
            MaterialView.prototype.new_properties.call(this);
            this.enum_properties.push('vertexColors');
            this.set_properties.push('color');
            this.scalar_properties.push('linewidth', 'scale', 'dashSize', 'gapSize', 'fog');
        },
        new_obj: function() {return new THREE.LineDashedMaterial();}
    });
    register['LineDashedMaterialView'] = LineDashedMaterialView;

    var NormalMaterialView = MaterialView.extend({
        new_properties: function() {
            MaterialView.prototype.new_properties.call(this);
            this.enum_properties.push('shading');
            this.scalar_properties.push('wireframe', 'wireframeLinewidth', 'morphTargets');
        },
        new_obj: function() {return new THREE.MeshNormalMaterial();}
    });
    register['NormalMaterialView'] = NormalMaterialView;

    var ParticleSystemMaterialView = MaterialView.extend({
        new_properties: function() {
            MaterialView.prototype.new_properties.call(this);
            this.set_properties.push('color');
            this.scalar_properties.push('size', 'sizeAttenuation', 'vertexColors', 'fog');
            this.child_properties.push('map');
        },
        new_obj: function() {return new THREE.ParticleSystemMaterial();}
    });
    register['ParticleSystemMaterialView'] = ParticleSystemMaterialView;

    var ShaderMaterialView = MaterialView.extend({
        new_properties: function() {
            MaterialView.prototype.new_properties.call(this);
            this.enum_properties.push('vertexColors', 'shading');
            this.scalar_properties.push('morphTargets', 'lights', 'morphNormals', 'wireframe', 'skinning', 'fog',
                                        'linewidth', 'wireframeLinewidth','fragmentShader', 'vertexShader');
        },
        new_obj: function() {return new THREE.ShaderMaterial();}
    });
    register['ShaderMaterialView'] = ShaderMaterialView;

    var MeshView = Object3dView.extend({
        // if we replace the geometry or material, do a full re-render
        // TODO: make sure we don't set multiple such handlers, so this should probably happen in the init, not the render
        //this.model.on('change:geometry', this.render, this);
        //this.model.on('change:material', this.render, this);
        render: function() {
            this.geometryview = this.create_child_view(this.model.get('geometry'));
            this.materialview = this.create_child_view(this.model.get('material'));
            this.geometryview.on('replace_obj', this.update, this);
            this.materialview.on('replace_obj', this.update, this);
            this.geometryview.on('rerender', this.needs_update, this);
            this.materialview.on('rerender', this.needs_update, this);
            Object3dView.prototype.render.call(this);
            //this.update();
            return this.obj;
        },
        update: function() {
            this.replace_obj(new THREE.Mesh( this.geometryview.obj, this.materialview.obj ));
            //this.obj.geometry = this.geometryview.obj;
            //this.obj.material = this.materialview.obj;
            //this.obj.material.needsUpdate=true;
            Object3dView.prototype.update.call(this);
        }
    });
    register['MeshView'] = MeshView;

    var LineView = MeshView.extend({
        update: function() {
            this.replace_obj(new THREE.Line(this.geometryview.obj, this.materialview.obj, THREE[this.model.get("type")]));
            Object3dView.prototype.update.call(this);
        }
    });
    register['LineView'] = LineView;

    var ImageTextureView = ThreeView.extend({
        update: function() {
            var img = new Image();
            //img.crossOrigin='anonymous';
            img.src = this.model.get('imageuri');
            img.onload = $.proxy(this.needs_update, this);
            this.replace_obj(new THREE.Texture(img));
            ThreeView.prototype.update.call(this);
        },
    });
    register['ImageTextureView'] = ImageTextureView;

    var DataTextureView = ThreeView.extend({
        update: function() {
            var dataType = this.model.get('type');
            var dataArr;
            var data = this.model.get('data');
            switch (dataType)
            {
                case 'UnsignedByteType':
                    dataArr = new Uint8Array(data.length);
                    break;
                case 'ByteType':
                    dataArr = new Int8Array(data.length);
                    break;
                case 'ShortType':
                    dataArr = new Int16Array(data.length);
                    break;
                case 'IntType':
                    dataArr = new Int32Array(data.length);
                    break;
                case 'UnsignedIntType':
                    dataArr = new Uint32Array(data.length);
                    break;
                case 'FloatType':
                    dataArr = new Float32Array(data.length);
                    break;
                case 'UnsignedShortType':
                case 'UnsignedShort4444Type':
                case 'UnsignedShort5551Type':
                case 'UnsignedShort565Type':
                    dataArr = new Uint16Array(data.length);
                    break;
            }
            dataArr.set(data);

            this.replace_obj(new THREE.DataTexture(dataArr, this.model.get('width'), this.model.get('height'),
                            THREE[this.model.get('format')], THREE[dataType], THREE[this.model.get('mapping')],
                            THREE[this.model.get('wrapS')], THREE[this.model.get('wrapT')],
                            THREE[this.model.get('magFilter')], THREE[this.model.get('minFilter')],
                            this.model.get('anisotropy')));
            ThreeView.prototype.update.call(this);
        },
    });
    register['DataTextureView'] = DataTextureView;

    var SpriteMaterialView = MaterialView.extend({
        new_properties: function() {
            MaterialView.prototype.new_properties.call(this);
            this.scalar_properties.push('sizeAttenuation', 'fog', 'useScreenCoordinates', 'scaleByViewport');
            this.array_properties.push('uvScale', 'uvOffset', 'alignment');
            this.set_properties.push('color');
            this.child_properties.push('map');
        },
        new_obj: function() {return new THREE.SpriteMaterial();}
    });
    register['SpriteMaterialView'] = SpriteMaterialView;

    var SpriteView = Object3dView.extend({
        render: function() {
            this.materialview = this.create_child_view(this.model.get('material'));
            this.materialview.on('replace_obj', this.update, this);
            this.materialview.on('rerender', this.needs_update, this);
            Object3dView.prototype.render.call(this);
            return this.obj;
        },
        update: function() {
            this.replace_obj(new THREE.Sprite(this.materialview.obj));
            Object3dView.prototype.update.call(this);
        },
        needs_update: function() {
            if (this.model.get('scaleToTexture')) {
                if (this.materialview.map.aspect) {
                    var scale = this.model.get('scale');
                    var y = (scale && scale[1]) || 1.0;
                    this.model.set('scale', [y*this.materialview.map.aspect,y,1]);
                    this.touch();
                }
            }
            Object3dView.prototype.needs_update.call(this);
        }
    });
    register['SpriteView'] = SpriteView;

    var TextTextureView = ThreeView.extend({
        update: function() {
            var fontFace = this.model.get('fontFace');
            var size = this.model.get('size');
            var color = this.model.get('color');
            var string = this.model.get('string');

            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d");

            canvas.height = size;
            var font = "Normal " + size + "px " + fontFace;
            context.font = font;

            var metrics = context.measureText(string);
            var textWidth = metrics.width;
            canvas.width = textWidth;

            if (this.model.get('squareTexture')) {
                canvas.height = canvas.width;
            }
            
            this.aspect = canvas.width / canvas.height;

            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = color;
            // Must set the font again for the fillText call
            context.font = font;
            context.fillText(string, canvas.width / 2, canvas.height / 2);
            
            this.replace_obj(new THREE.Texture(canvas));
            ThreeView.prototype.update.call(this);
        }
    });
    register['TextTextureView'] = TextTextureView;

    var Basic3dObject = Object3dView.extend({
        render: function() {
            this.update();
            return this.obj;
        },
        update: function() {
            this.replace_obj(this.new_obj());
            Object3dView.prototype.update.call(this);
        }
    });
    var AmbientLight = Basic3dObject.extend({
        new_obj: function() {return new THREE.AmbientLight(this.model.get('color'));}
    });
    register['AmbientLight'] = AmbientLight;

    var DirectionalLight = Basic3dObject.extend({
        new_obj: function() {
            return new THREE.DirectionalLight(this.model.get('color'),
                                              this.model.get('intensity'));
        }
    });
    register['DirectionalLight'] = DirectionalLight;

    var PointLight = Basic3dObject.extend({
        new_obj: function() {
            return new THREE.PointLight(this.model.get('color'),
                                        this.model.get('intensity'),
                                        this.model.get('distance'));
        }
    });
    register['PointLight'] = PointLight;

    var SpotLight = Basic3dObject.extend({
        new_obj: function() {
            return new THREE.SpotLight(this.model.get('color'),
                                       this.model.get('intensity'),
                                       this.model.get('distance'));
        }
    });
    register['SpotLight'] = SpotLight;

    var HemisphereLight = Basic3dObject.extend({
        new_obj: function() {
            return new THREE.HemisphereLight(this.model.get('color'),
                                             this.model.get('ground_color'),
                                             this.model.get('intensity'));
        }
    });
    register['HemisphereLight'] = HemisphereLight;


    /* Extra helpers */
    var SurfaceGridView = MeshView.extend({
        update: function() {
            // Construct the grid lines from this.geometryview.obj
            var vertices = this.geometryview.obj.vertices;
            var xpoints = this.geometryview.obj.parameters.widthSegments+1;
            var ypoints = this.geometryview.obj.parameters.heightSegments+1;
            var g, xi, yi;
            var lines = [];
            var obj = new THREE.Object3D();

            for (xi = 0; xi<xpoints; xi++) {
                g = new THREE.Geometry();
                for (yi = 0; yi<ypoints; yi++) {
                    g.vertices.push(vertices[xi*xpoints+yi].clone());
                }
                obj.add(new THREE.Line(g, this.materialview.obj));
            }

            for (yi = 0; yi<ypoints; yi++) {
                g = new THREE.Geometry();
                for (xi = 0; xi<xpoints; xi++) {
                    g.vertices.push(vertices[xi*xpoints+yi].clone());
                }
                obj.add(new THREE.Line(g, this.materialview.obj));
            }

            this.replace_obj(obj);
            Object3dView.prototype.update.call(this);
        }
    });
    register['SurfaceGridView'] = SurfaceGridView;

    /* We keep these lines in here for backwards compatibility, to be removed when IPython 3.0 is released */
    for (var key in register) {
        if (register.hasOwnProperty(key)) {
            manager.WidgetManager.register_widget_view(key, register[key]);
        }
    }
    return register;

});
